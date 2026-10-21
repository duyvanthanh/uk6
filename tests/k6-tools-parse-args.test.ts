import test from "node:test";
import assert from "node:assert/strict";

test("k6-tools: rejects removed uk6 options", async () => {
  const { parseArgs } = await import("../src/k6-tools/run/cli/parseArgs.js");
  const cases = [
    { argv: ["script.js", "--beautify"], pattern: /--beautify/ },
    { argv: ["script.js", "--beautify=true"], pattern: /--beautify/ },
    { argv: ["script.js", "--log-output=console"], pattern: /--log-console/ },
    { argv: ["script.js", "--remove"], pattern: /\.k6-build cleanup now happens automatically/ },
    { argv: ["script.js", "--remove=false"], pattern: /\.k6-build cleanup now happens automatically/ },
    { argv: ["script.js", "--no-treeshake"], pattern: /--treeshake=false/ },
    { argv: ["script.js", "--no-proxy"], pattern: /--proxy=false/ },
    { argv: ["script.js", "--ide-remote"], pattern: /IDEA remote integration has been removed/ },
    { argv: ["script.js", "--ide-remote-port=63342"], pattern: /IDEA remote integration has been removed/ },
  ];

  for (const { argv, pattern } of cases) {
    const parsed = parseArgs(argv, process.env);
    assert.equal(parsed.ok, false);
    if (parsed.ok) continue;
    assert.equal(parsed.exitCode, 1);
    assert.match(parsed.errorMessage, pattern);
  }
});
