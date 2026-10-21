import * as fs from "node:fs";

import * as path from "node:path";

import { fileURLToPath } from "node:url";

import { rollup } from "rollup";

import commonjs from "@rollup/plugin-commonjs";

import { nodeResolve } from "@rollup/plugin-node-resolve";



const ALIASES = ["src", "tests", "k6-report"];



export type BundleSourceMapMode = "off" | "inline" | "external";



export type BundleFeaturesMode = "auto" | "all" | "http" | "http,sql";



export type BuildForK6Options = {

  treeshake?: boolean;

  sourcemap?: BundleSourceMapMode;

  features?: BundleFeaturesMode | { sql?: boolean };

};



type ResolvedBundleFeatures = {

  sql: boolean;

};



function findNearestPackageRoot(startDir: string) {
  let current = path.resolve(startDir);

  for (let i = 0; i < 10; i++) {

    const pkgJson = path.join(current, "package.json");

    if (fs.existsSync(pkgJson)) return current;

    const parent = path.dirname(current);

    if (parent === current) break;

    current = parent;

  }

  return null;
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRetryableFsError(err: any) {
  const code = err?.code;
  return code === "EBUSY" || code === "EPERM" || code === "EACCES" || code === "ENOTEMPTY";
}

function withFsRetry<T>(fn: () => T, options: { retries?: number; delayMs?: number } = {}) {
  const retries = typeof options.retries === "number" ? options.retries : 8;
  const delayMs = typeof options.delayMs === "number" ? options.delayMs : 40;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return fn();
    } catch (err: any) {
      if (attempt >= retries || !isRetryableFsError(err)) throw err;
      sleepSync(delayMs);
    }
  }
}


function resolveSelfInstalledEsmModule(moduleSubPath: string) {

  const hereDir =

    typeof __dirname === "string"

      ? __dirname

      : path.dirname(fileURLToPath((0, eval)("import.meta.url") as string));



  const pkgRoot = findNearestPackageRoot(hereDir);

  if (!pkgRoot) return null;



  const distEsmRoot = path.join(pkgRoot, "dist", "esm", "src");

  let candidate = path.join(distEsmRoot, moduleSubPath);



  if (!path.extname(candidate)) {

    const asFile = `${candidate}.js`;

    const asIndex = path.join(candidate, "index.js");

    if (fs.existsSync(asFile)) return asFile;

    if (fs.existsSync(asIndex)) return asIndex;

    candidate = asFile;

  }



  if (fs.existsSync(candidate)) return candidate;

  return null;

}



/**

 * Bundle entry script của dự án để chạy với k6.

 *

 * Hành vi:

 * - Copy `src/`, `tests/`, `k6-report/` vào `.k6-build/`

 * - Rewrite import dạng `src/utils` về relative path bên trong `.k6-build/`

 * - Dùng Rollup xuất ra 1 file ESM `*.bundle.js` (tuỳ chọn sourcemap)

 * - Import `k6/*` được coi là external (k6 cung cấp lúc runtime)

 *

 * Thư mục hiện tại (`process.cwd()`) được coi là root của project consumer.

 */



/**

 * @internal Chuẩn hoá path thành dạng POSIX để in log dễ đọc.

 */

function toPosixPath(value: unknown) {

  return String(value || "").replace(/\\/g, "/");

}



/**

 * @internal Format lỗi Rollup thành message dễ đọc khi build thất bại.

 */

function formatRollupError(err: any, context: { projectRoot?: string } = {}) {

  if (!err) {

    return "Unknown build error";

  }



  const projectRoot = context.projectRoot || process.cwd();

  const details: string[] = [];

  const code = err.code ? ` (${err.code})` : "";

  const headline = err.message || err.cause?.message || String(err);

  details.push(`Build failed${code}: ${headline}`);



  const candidateFile = err.loc?.file || err.id || err.pluginCodeLocation?.file || err.cause?.loc?.file || null;



  if (candidateFile) {

    const relativeFile = toPosixPath(path.relative(projectRoot, candidateFile));

    details.push(`File: ${relativeFile}`);

  }



  const line = err.loc?.line || err.pluginCodeLocation?.line || err.cause?.loc?.line || null;

  const column = err.loc?.column || err.pluginCodeLocation?.column || err.cause?.loc?.column || null;



  if (line != null) {

    if (column != null) {

      details.push(`Location: line ${line}, column ${column}`);

    } else {

      details.push(`Location: line ${line}`);

    }

  }



  if (err.frame) {

    details.push("Code frame:");

    details.push(err.frame);

  }



  return details.join("\n");

}



/**

 * @internal Trích vị trí lỗi (file/line/column) từ error của Rollup/plugin để phục vụ IDE remote open.

 */

function extractRollupLocation(err: any) {

  if (!err) return null;



  const file = err.loc?.file || err.id || err.pluginCodeLocation?.file || err.cause?.loc?.file || null;

  if (!file) return null;



  return {

    file,

    line: err.loc?.line || err.pluginCodeLocation?.line || err.cause?.loc?.line || null,

    column: err.loc?.column || err.pluginCodeLocation?.column || err.cause?.loc?.column || null,

  };

}



/**

 * @internal Rollup rewrite specifier cần `./` để là relative import.

 */

function ensureDotPrefix(spec: string) {

  if (spec.startsWith(".") || spec.startsWith("/")) return spec;

  return `./${spec}`;

}



/** 

 * @internal Rewrite bare import `src/...` / `tests/...` / `k6-report/...` thành relative path trong `.k6-build`.

 */

function rewriteSpecifier(spec: string, compiledFilePath: string, projectRoot: string, buildRoot: string) {

  for (const alias of ALIASES) {

    if (spec === alias || spec.startsWith(`${alias}/`)) {

      const subPath = spec === alias ? "" : spec.slice(alias.length + 1);

      const normalizedSubPath = subPath.replace(/\//g, path.sep);



      const sourceBase = path.join(projectRoot, alias);

      const sourceTarget = path.join(sourceBase, normalizedSubPath);



      let targetCompiled = path.join(buildRoot, alias, normalizedSubPath);



      if (subPath === "") {

        const indexSource = path.join(sourceBase, "index.js");

        if (fs.existsSync(indexSource)) {

          targetCompiled = path.join(buildRoot, alias, "index.js");

        }

      } else if (fs.existsSync(sourceTarget) && fs.statSync(sourceTarget).isDirectory()) {

        targetCompiled = path.join(buildRoot, alias, normalizedSubPath, "index.js");

      }



      const fromDir = path.dirname(compiledFilePath);

      let rel = path.relative(fromDir, targetCompiled).replace(/\\/g, "/");

      rel = ensureDotPrefix(rel);

      return rel;

    }

  }

  return spec;

}



/** 

 * @internal Transform code JS bằng cách rewrite các import/export specifier theo `.k6-build` layout.

 */

function transformCode(code: string, compiledFilePath: string, projectRoot: string, buildRoot: string) {

  const importFromRegex = /(import\s+[^'"]*from\s+['"])([^'"]+)(['"]\s*;?)/g;

  const exportFromRegex = /(export\s+[^'"]*from\s+['"])([^'"]+)(['"]\s*;?)/g;

  const bareImportRegex = /(import\s+['"])([^'"]+)(['"]\s*;?)/g;



  const replacer = (_match: string, prefix: string, spec: string, suffix: string) =>

    prefix + rewriteSpecifier(spec, compiledFilePath, projectRoot, buildRoot) + suffix;



  code = code.replace(importFromRegex, replacer);

  code = code.replace(exportFromRegex, replacer);

  code = code.replace(bareImportRegex, replacer);

  return code;

}



/**

 * @internal Copy directory và rewrite các file `.js` để tương thích import alias trong môi trường bundle.

 */

function copyDirWithTransform(srcDir: string, destDir: string, projectRoot: string, buildRoot: string) {
  if (!fs.existsSync(srcDir)) return;

  withFsRetry(() => fs.mkdirSync(destDir, { recursive: true }));


  const entries = fs.readdirSync(srcDir, { withFileTypes: true });



  for (const entry of entries) {

    const srcPath = path.join(srcDir, entry.name);

    const destPath = path.join(destDir, entry.name);



    if (entry.isDirectory()) {

      copyDirWithTransform(srcPath, destPath, projectRoot, buildRoot);

    } else if (entry.isFile()) {

      if (srcPath.endsWith(".js")) {
        const code = withFsRetry(() => fs.readFileSync(srcPath, "utf8"));
        const transformed = transformCode(code, destPath, projectRoot, buildRoot);
        withFsRetry(() => fs.writeFileSync(destPath, transformed, "utf8"));
      } else {
        withFsRetry(() => fs.copyFileSync(srcPath, destPath));
      }
    }
  }
}


/**

 * @internal Bundle bằng Rollup ra 1 file ESM `*.bundle.js`.

 */

function readFileSafe(filePath: string) {

  try {

    return fs.readFileSync(filePath, "utf8");

  } catch {

    return "";

  }

}



function tryResolveLocalModule(spec: string, fromFile: string) {

  if (!spec.startsWith(".")) return null;



  const fromDir = path.dirname(fromFile);

  const base = path.resolve(fromDir, spec);



  const candidates = [

    base,

    `${base}.js`,

    `${base}.ts`,

    path.join(base, "index.js"),

    path.join(base, "index.ts"),

  ];



  for (const c of candidates) {

    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;

  }



  return null;

}



function extractImportSpecifiers(code: string) {

  const specs: string[] = [];



  const importFromRegex = /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g;

  const exportFromRegex = /export\s+[^'"]*from\s+['"]([^'"]+)['"]/g;

  const bareImportRegex = /import\s+['"]([^'"]+)['"]/g;



  const pushAll = (re: RegExp) => {

    re.lastIndex = 0;

    let m: RegExpExecArray | null;

    while ((m = re.exec(code))) specs.push(m[1]);

  };



  pushAll(importFromRegex);

  pushAll(exportFromRegex);

  pushAll(bareImportRegex);



  return specs;

}



function detectSqlUsageFromBuild(entryFile: string, buildRoot: string) {

  const visited = new Set<string>();

  const stack = [entryFile];



  const hints = [

    /protocol\s*:\s*["']sql["']/,

    /protocol\s*===\s*["']sql["']/,

    /method\s*===\s*["']SQL["']/,

    /method\s*:\s*["']SQL["']/,

    /\bk6\/x\/sql\b/,

    /\bcreateSqlQuery\b/,

    /\bcreateOracleDsn\b/,

    /\bSqlQueryModel\b/,

  ];



  const buildRootAbs = path.resolve(buildRoot) + path.sep;



  while (stack.length > 0) {

    const current = stack.pop() as string;

    if (visited.has(current)) continue;

    visited.add(current);



    const normalized = path.resolve(current);

    if (!normalized.startsWith(buildRootAbs)) continue;



    const code = readFileSafe(normalized);

    if (!code) continue;



    if (hints.some((re) => re.test(code))) return true;



    const specs = extractImportSpecifiers(code);

    for (const spec of specs) {

      const resolved = tryResolveLocalModule(spec, normalized);

      if (resolved) stack.push(resolved);

    }

  }



  return false;

}



function resolveFeatures(options: BuildForK6Options, entryFile: string, buildRoot: string): ResolvedBundleFeatures {

  const mode = options.features ?? "auto";



  if (typeof mode === "object" && mode) {

    return { sql: mode.sql !== false };

  }



  if (mode === "all") return { sql: true };

  if (mode === "http") return { sql: false };

  if (mode === "http,sql") return { sql: true };



  return { sql: detectSqlUsageFromBuild(entryFile, buildRoot) };

}



async function bundleWithRollup(

  entryFile: string,

  opts: Required<Pick<BuildForK6Options, "treeshake" | "sourcemap">> & { features: ResolvedBundleFeatures },

) {

  const outDir = path.dirname(entryFile);

  const baseName = path.basename(entryFile, path.extname(entryFile));

  const outFile = path.join(outDir, `${baseName}.bundle.js`);



  const sourcemap =

    opts.sourcemap === "inline" ? "inline" : opts.sourcemap === "external" ? true : false;



  let bundle: any;

  try {

    const SQL_REQUEST_STUB_ID = "\0uk6:sql-request-stub";

    const sqlRequestRealPath = resolveSelfInstalledEsmModule("k6-framework/base/sql-request.js");



    bundle = await rollup({

      input: entryFile,

      external: (id) => /^k6(\/.*)?$/.test(id),

      plugins: [

        {

          name: "uk6-feature-pruner",

          resolveId(source, importer) {

            if (opts.features.sql) return null;

            if (!source) return null;



            if (

              source.endsWith("/sql-request.js") ||

              source.endsWith("\\sql-request.js") ||

              source === "./sql-request.js" ||

              source === "../sql-request.js" ||

              source === "sql-request.js"

            ) {

              const importerNorm = importer ? toPosixPath(importer) : "";

              if (importerNorm.includes("/dist/esm/src/k6-framework/")) {

                return SQL_REQUEST_STUB_ID;

              }

            }



            return null;

          },

          load(id) {

            if (id === SQL_REQUEST_STUB_ID) {

              return [

                "export function sqlRequest() {",

                "  throw new Error(",

                "    'SQL feature not bundled. Re-run with --bundle-features=all or --bundle-features=http,sql',",

                "  );",

                "}",

                "",

              ].join("\n");

            }



            if (!opts.features.sql && sqlRequestRealPath) {

              const idNorm = path.resolve(id);

              const realNorm = path.resolve(sqlRequestRealPath);

              if (idNorm === realNorm) {

                return [

                  "export function sqlRequest() {",

                  "  throw new Error(",

                  "    'SQL feature not bundled. Re-run with --bundle-features=all or --bundle-features=http,sql',",

                  "  );",

                  "}",

                  "",

                ].join("\n");

              }

            }



            return null;

          },

        },

        {

          name: "uk6-self-resolver",

          resolveId(source) {

            if (source === "uk6") {

              return resolveSelfInstalledEsmModule("index.js");

            }

            if (source.startsWith("uk6/")) {

              const subPath = source.slice("uk6/".length);

              return resolveSelfInstalledEsmModule(subPath);

            }

            return null;

          },

        },

        nodeResolve({

          browser: true,

          preferBuiltins: false,

        }),

        commonjs(),

      ],

      treeshake: opts.treeshake

        ? {

            moduleSideEffects: false,

          }

        : false,

    });



    await bundle.write({

      file: outFile,

      format: "esm",

      sourcemap,

    });

  } catch (err: any) {

    const wrappedError: any = new Error(formatRollupError(err), { cause: err });

    wrappedError.rollupLocation = extractRollupLocation(err);

    throw wrappedError;

  } finally {

    if (bundle) {

      await bundle.close();

    }

  }



  return outFile;

}



/**

 * Bundle 1 entry script để chạy bằng k6.

 *

 * `uk6` CLI sẽ gọi hàm này trước khi spawn `k6 run ...`.

 *

 * Ví dụ (Node-side):

 * ```js

 * import { buildForK6 } from "uk6/k6-tools";

 *

 * const bundlePath = await buildForK6("tests/performance/APP/card-getList-perf.js");

 * console.log(bundlePath);

 * ```

 *

 * @param entryScriptPath Đường dẫn entry script (tính từ project root hoặc absolute path).

 * @returns Đường dẫn file bundle `*.bundle.js` trong `.k6-build`.

 */

export async function buildForK6(entryScriptPath: string, options: BuildForK6Options = {}) {

  const projectRoot = process.cwd();

  const sourceRoot = process.env.UK6_SOURCE_ROOT ? path.resolve(process.env.UK6_SOURCE_ROOT) : projectRoot;

  const buildRoot = path.join(projectRoot, ".k6-build");

  const entryAbs = path.isAbsolute(entryScriptPath) ? entryScriptPath : path.resolve(sourceRoot, entryScriptPath);



  const effectiveOptions: Required<Pick<BuildForK6Options, "treeshake" | "sourcemap">> = {

    treeshake: options.treeshake !== false,

    sourcemap: options.sourcemap || "off",

  };



  withFsRetry(() => fs.rmSync(buildRoot, { recursive: true, force: true }), { retries: 10, delayMs: 60 });


  const rootsToCopy = ["src", "tests", "k6-report"];

  for (const dir of rootsToCopy) {

    const srcDir = path.join(sourceRoot, dir);

    const destDir = path.join(buildRoot, dir);

    copyDirWithTransform(srcDir, destDir, sourceRoot, buildRoot);

  }



  const relEntry = path.relative(sourceRoot, entryAbs);

  if (!relEntry || relEntry.startsWith("..") || path.isAbsolute(relEntry)) {

    throw new Error(`Entry script must be under source root: entry=${toPosixPath(entryAbs)} sourceRoot=${toPosixPath(sourceRoot)}`);

  }

  const compiledEntry = path.join(buildRoot, relEntry);



  if (!fs.existsSync(compiledEntry)) {

    throw new Error(

      `Compiled entry script not found: ${compiledEntry}. ` +

        `Make sure the entry is inside one of: src, tests, k6-report.`,

    );

  }



  const features = resolveFeatures(options, compiledEntry, buildRoot);

  return bundleWithRollup(compiledEntry, { ...effectiveOptions, features });

}

