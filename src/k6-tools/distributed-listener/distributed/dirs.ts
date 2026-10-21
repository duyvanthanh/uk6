import * as path from "node:path"

import * as fs from "node:fs";

import { ensureDir } from "../fs/dirs.js";



export function buildDistributedDirs(distributedPath: string) {

  const root = path.resolve(distributedPath);

  const internalRoot = path.join(root, ".uk6-distributed");

  return {

    root,

    internalRoot,

    requestsDir: path.join(internalRoot, "requests"),

    runsDir: path.join(internalRoot, "runs"),

    reportsDir: path.join(internalRoot, "reports"),

    workspacesDir: path.join(internalRoot, "workspaces"),

    agentsDir: path.join(internalRoot, "agents"),

  };

}





export function copyDirRecursive(srcDir: string, dstDir: string) {

  try {

    if (!fs.existsSync(srcDir)) return;

    const stat = fs.statSync(srcDir);

    if (!stat.isDirectory()) return;

    ensureDir(dstDir);



    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {

      const src = path.join(srcDir, entry.name);

      const dst = path.join(dstDir, entry.name);

      if (entry.isDirectory()) {

        copyDirRecursive(src, dst);

      } else if (entry.isFile()) {

        copyFileIfExists(src, dst);

      }

    }

  } catch (_) {

    // ignore

  }

}



export function copyFileIfExists(src: string, dst: string) {

  try {

    if (!fs.existsSync(src)) return false;

    ensureDir(path.dirname(dst));

    fs.copyFileSync(src, dst);

    return true;

  } catch (_) {

    return false;

  }

}

