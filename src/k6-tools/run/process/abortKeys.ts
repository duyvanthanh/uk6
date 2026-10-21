import type { CancellationHandlers } from "./cancellation.js";



export type AbortKeyHandlers = {

  uninstall: () => void;

};



/**

 * Đặt Ctrl+X handler để ngừng run k6 nhưng tiếp tục run postRun.

 *

 * Lưu ý:

 * - Ctrl+C vẫn là SIGINT (force termination)

 * - Ctrl+X bắn ASCII 0x18 và chỉ hoạt động nếu stdin là TTY.

 */

export function installAbortWithPostRunKey({

  cancellation,

  enabled = true,

  debugMode,

}: {
  cancellation: Pick<CancellationHandlers, "cancelK6">;
  enabled?: boolean;

  debugMode: boolean;

}): AbortKeyHandlers {

  const stdin: any = process.stdin as any;

  const isTty = !!stdin && !!stdin.isTTY;

  if (!enabled || !isTty) return { uninstall: () => {} };



  let installed = false;

  const prevRawMode = typeof stdin.isRaw === "boolean" ? stdin.isRaw : null;



  const onData = (chunk: Buffer | string) => {

    try {

      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;

      if (!buf || buf.length === 0) return;

      const key = buf[0];



      // Ctrl+C = 0x03; khi stdin ở raw mode thì Node không tự phát SIGINT. 

      // Gi? Ctrl+C bắn bằng cách tự phát SIGINT cho chính process này. 

      if (key === 0x03) {

        try {

          process.kill(process.pid, "SIGINT");

        } catch (_e) {

          // fallback

          process.emit("SIGINT");

        }

        return;

      }



      // Ctrl+X = 0x18

      if (key === 0x18) {

        if (debugMode) {
          // eslint-disable-next-line no-console 
          console.log("[uk6] Ctrl+X received: abort requested (will run postRun)");
        }
        cancellation.cancelK6("SIGINT");
      }
    } catch (_e) {

      // ignore

    }

  };



  try {

    if (typeof stdin.setRawMode === "function") stdin.setRawMode(true);

    stdin.resume();

    stdin.on("data", onData);

    installed = true;

  } catch (_e) {

    installed = false;

  }



  const uninstall = () => {

    try {

      if (!installed) return;

      stdin.removeListener("data", onData);

      if (typeof stdin.setRawMode === "function" && prevRawMode !== null) stdin.setRawMode(prevRawMode);

    } catch (_e) {

      // ignore

    }

  };



  return { uninstall };

}

