import * as path from "node:path";

import * as fs from "node:fs";



export function cancelFileFor({ runsDir, runId }: { runsDir: string; runId: string }) {

  return path.join(runsDir, runId, "cancel.json");

}



export function isCancelled({ runsDir, runId }: { runsDir: string; runId: string }) {

  const p = cancelFileFor({ runsDir, runId });

  return fs.existsSync(p);

}

