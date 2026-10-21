import * as fs from "node:fs";

import * as path from "node:path";

import { ensureDir } from "./dirs.js";



export function safeReadJson(filePath: fs.PathOrFileDescriptor) {

  try {

    const raw = fs.readFileSync(filePath, "utf8");

    return JSON.parse(raw);

  } catch (err) {

    return null;

  }

}



export function writeJsonAtomic(filePath: string, data: any) {

  ensureDir(path.dirname(filePath));

  const tmp = `${filePath}.${process.pid}.tmp`;

  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");

  fs.renameSync(tmp, filePath);

}

