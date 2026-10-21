import * as path from "node:path";

import * as fs from "node:fs";

import { ensureDir } from "../fs/dirs.js";

import { safeReadJson, writeJsonAtomic } from "../fs/json.js";



function errMessage(err: unknown): string {

  return err instanceof Error ? err.message : String(err);

}



function errCode(err: unknown): string | undefined {

  if (!err || typeof err !== "object") return undefined;

  if (!("code" in err)) return undefined;

  const code = (err as { code?: unknown }).code;

  return typeof code === "string" ? code : undefined;

}



export function parseVariantVarsFromLine(line: unknown): Record<string, string> | null {

  const src = String(line || "").trim();

  if (!src || src.startsWith("#")) return null;



  // Format A: JSON object mỗi line. Ví dụ: {"USER_ID":"user-a"}

  if (src.startsWith("{") && src.endsWith("}")) {

    try {

      const obj = JSON.parse(src);

      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;

      const vars: Record<string, string> = {};

      for (const [k, v] of Object.entries(obj)) {

        if (!k) return null;

        vars[String(k)] = v == null ? "" : String(v);

      }

      return Object.keys(vars).length ? vars : null;

    } catch (_) {

      return null;

    }

  }



  // Format B: đơn KEY=VALUE (cho phép ""). Ví dụ: USER_ID=user-a | USER_ID="user-a"

  const m = src.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))\s*$/);

  if (!m) return null;

  const key = m[1];

  const value = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : "";

  return { [key]: String(value) };

}



export function applyVariantToArgv(argv: any, vars: any) {

  const out = Array.isArray(argv) ? argv.slice() : [];

  const existing = new Map(); // key -> { i, mode }



  for (let i = 0; i < out.length; i++) {

    const a = String(out[i]);

    if (a === "-e" && i + 1 < out.length) {

      const v = String(out[i + 1]);

      const eq = v.indexOf("=");

      if (eq > 0) {

        existing.set(v.slice(0, eq), { i: i + 1, mode: "pair" });

      }

      i++;

      continue;

    }

    if (a.startsWith("-e") && a.length > 2) {

      const v = a.slice(2);

      const eq = v.indexOf("=");

      if (eq > 0) {

        existing.set(v.slice(0, eq), { i, mode: "inline" });

      }

    }

  }



  for (const [key, value] of Object.entries(vars || {})) {

    const encodedValue =

      typeof value === "string" && (value.includes(" ") || value.includes('"'))

        ? `"${value.replaceAll('"', '\\"')}"`

        : String(value);

    const assignment = `${key}=${encodedValue}`;

    const hit = existing.get(key);

    if (hit) {

      if (hit.mode === "pair") {

        out[hit.i] = assignment;

      } else {

        out[hit.i] = `-e${assignment}`;

      }

    } else {

      out.push("-e", assignment);

    }

  }



  return out;

}



export function variantClaimsDirFor({ runsDir, runId }: { runsDir: any, runId: any}) {

  return path.join(runsDir, runId, "variant-claims");

}



export function variantAgentClaimFileFor({ runsDir, runId, agentId }: { runsDir: any, runId: any, agentId: any }) {

  return path.join(variantClaimsDirFor({ runsDir, runId }), `agent-${agentId}.json`);

}



export function claimVariantForAgent({ dirs, request, runId, agentId, nodeId, debug }: { dirs: any, request: any, runId: any, agentId: any, nodeId: any, debug: any }) {

  const claimsDir = variantClaimsDirFor({ runsDir: dirs.runsDir, runId });

  try {

    ensureDir(claimsDir);

  } catch (err: unknown) {

    if (debug) console.error(`[uk6-distributed] Failed to create variant claims dir: ${claimsDir}`, errMessage(err));

    return null;

  }



  const existingClaimFile = variantAgentClaimFileFor({ runsDir: dirs.runsDir, runId, agentId });

  const existingClaim = safeReadJson(existingClaimFile);

  if (existingClaim && existingClaim.vars) {

    return existingClaim;

  }



  const fileRel = request?.variant?.fileRel || null;

  if (!fileRel) return null;

  const normalizedRel = String(fileRel).replace(/\\/g, "/");

  const variantAbs = path.resolve(dirs.internalRoot, normalizedRel);

  if (!fs.existsSync(variantAbs)) {

    return null;

  }



  const lines = fs

    .readFileSync(variantAbs, "utf8")

    .split(/\r?\n/)

    .map((l) => String(l || "").trim())

    .filter((l) => l && !l.startsWith("#"));



  for (let idx = 0; idx < lines.length; idx++) {

    const lineRaw = lines[idx];

    const vars = parseVariantVarsFromLine(lineRaw);

    if (!vars) {

      continue;

    }



    const lockFile = path.join(claimsDir, `line-${idx}.json`);

    try {

      const fd = fs.openSync(lockFile, "wx");

      try {

        fs.writeFileSync(

          fd,

          JSON.stringify(

            {

              schemaVersion: 1,

              tool: "uk6",

              runId,

              agentId,

              nodeId,

              lineIndex: idx,

              line: lineRaw,

              claimedAtEpochMs: Date.now(),

            },

            null,

            2

          ),

          "utf8"

        );

      } finally {

        try {

          fs.closeSync(fd);

        } catch (_) {

          // ignore

        }

      }



      const claim = {

        schemaVersion: 1,

        tool: "uk6",

        runId,

        agentId,

        nodeId,

        lineIndex: idx,

        line: lineRaw,

        vars,

        claimedAtEpochMs: Date.now(),

      };

      writeJsonAtomic(existingClaimFile, claim);

      if (debug) console.log(`[uk6-distributed] Variant claimed: runId=${runId} agentId=${agentId} line=${idx}`);

      return claim;

    } catch (err: unknown) {

      // Nếu agent khác claim rồi thì đi tiếp, không throw

      if (errCode(err) === "EEXIST") {

        continue;

      }

      if (debug) console.error(`[uk6-distributed] Failed to claim variant line: ${lockFile}`, errMessage(err));

      return null;

    }

  }



  return { noVariantAvailable: true };

}

