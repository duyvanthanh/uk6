import { spawn } from "node:child_process";
import * as fs from "node:fs";

export function openInDefaultBrowser(target: string) {
    if (!target) return false;
    const captureFile = process.env.UK6_BROWSER_OPEN_LOGFILE;
    if (captureFile) {
        try {
            fs.appendFileSync(captureFile, `${target}\n`, "utf8");
            return true;
        } catch (_) {
            return false;
        }
    }
    try {
        if (process.platform === "win32") {
            spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore", windowsHide: true });
            return true;
        }
        if (process.platform === "darwin") {
            spawn("open", [target], { detached: true, stdio: "ignore" });
            return true;
        }
        spawn("xdg-open", [target], { detached: true, stdio: "ignore" });
        return true;
    } catch (_) {
        return false;
    }
}
