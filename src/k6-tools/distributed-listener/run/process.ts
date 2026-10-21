import { spawnSync, type ChildProcess } from "node:child_process";



export function isPidAlive(pid: number | undefined | null) {

  try {

    if (!pid || typeof pid !== "number") return false;

    process.kill(pid, 0);

    return true;

  } catch (_) {

    return false;

  }

}



export function forceKillProcessTree(

  child: ChildProcess,

  opts: {

    debug?: boolean;

    label?: string;

  }

) {

  const { debug, label } = opts;

  try {

    const pid = child?.pid;

    if (!pid) return false;

    if (!isPidAlive(pid)) return true;



    if (process.platform === "win32") {

      // Windows: signals có thể không kill được process tree (node -> k6.exe).

      // Dùng taskkill để kill cả cây process.

      const res = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {

        encoding: "utf8",

        windowsHide: true,

      });

      if (debug) {

        const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();

        if (out) console.log(`[uk6-distributed] taskkill (${label || "child"} pid=${pid}):\n${out}`);

      }

      return true;

    }



    // POSIX: cố gắng kill process chính; caller thường đã thử SIGINT/SIGTERM trước đó.

    try {

      child.kill("SIGKILL");

    } catch (_) {

      // ignore

    }

    return true;

  } catch (_) {

    return false;

  }

}



