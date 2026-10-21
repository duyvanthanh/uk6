import * as fs from "node:fs";



export function ensureDir(p: fs.PathLike) {

  fs.mkdirSync(p, { recursive: true });

}



export function tryRmDirRecursive(dirPath: fs.PathLike) {

  try {

    if (fs.existsSync(dirPath)) {

      fs.rmSync(dirPath, { recursive: true, force: true });

      return true;

    }

  } catch (_) {

    // ignore

  }

  return false;

}

