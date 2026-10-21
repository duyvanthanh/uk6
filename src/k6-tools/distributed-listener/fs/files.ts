import * as fs from "node:fs"

import * as path from "node:path"



export function copyFileIfExists(src: string, dst: string) {

  try {

    if (!fs.existsSync(src)) return false;

    fs.mkdirSync(path.dirname(dst), { recursive: true });

    fs.copyFileSync(src, dst);

    return true;

  } catch (_) {

    return false;

  }

}



export function copyDirRecursive(srcDir: string, dstDir: string) {

  try {

    if (!fs.existsSync(srcDir)) return false;

    fs.mkdirSync(dstDir, { recursive: true });



    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const e of entries) {

      const src = path.join(srcDir, e.name);

      const dst = path.join(dstDir, e.name);

      if (e.isDirectory()) {

        copyDirRecursive(src, dst);

      } else if (e.isFile()) {

        copyFileIfExists(src, dst);

      }

    }

    return true;

  } catch (_) {

    return false;

  }

}



export function listRequestFiles(requestsDir: string) {

  if (!fs.existsSync(requestsDir)) {

    return [];

  }

  return fs

    .readdirSync(requestsDir)

    .filter((f) => f.toLowerCase().endsWith(".json"))

    .map((f) => path.join(requestsDir, f));

}



export function tryDeleteFile(filePath: fs.PathLike) {

  try {

    if (fs.existsSync(filePath)) {

      fs.unlinkSync(filePath);

      return true;

    }

  } catch (_) {

    // bỏ qua

  }

  return false;

}

