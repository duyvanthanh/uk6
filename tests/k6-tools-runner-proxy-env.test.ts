import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";

import { spawnSync } from "node:child_process";



function mkTempDir(prefix: string) {

  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));

}



function writeFile(p: string, content: string) {

  fs.mkdirSync(path.dirname(p), { recursive: true });

  fs.writeFileSync(p, content, "utf8");

}



function createNodeStubK6(projectDir: string, captureFile: string) {

  const stubDir = path.join(projectDir, "stub-bin");

  fs.mkdirSync(stubDir, { recursive: true });

  const stubJs = path.join(stubDir, "k6-stub.js");

  writeFile(

    stubJs,

    `

const fs = require("fs");

fs.writeFileSync(process.argv[2], JSON.stringify({

  http_proxy: process.env.http_proxy,

  HTTP_PROXY: process.env.HTTP_PROXY,

  https_proxy: process.env.https_proxy,

  HTTPS_PROXY: process.env.HTTPS_PROXY,

  no_proxy: process.env.no_proxy,

  NO_PROXY: process.env.NO_PROXY

}, null, 2), "utf8");

fs.writeFileSync("error_log.raw.json", "", "utf8");

`,

  );

  writeFile(path.join(stubDir, "k6.cmd"), `@echo off\r\nnode "${stubJs.replace(/\\/g, "\\\\")}" "${captureFile.replace(/\\/g, "\\\\")}" %*\r\n`);

  return stubDir;

}



function runWithArgs(runJs: string, projectDir: string, extraArgs: string[], captureFile: string) {

  const stubDir = createNodeStubK6(projectDir, captureFile);

  const env = {

    ...process.env,

    PATH: `${stubDir};${process.env.PATH || ""}`,

    HTTP_PROXY: "http://proxy.local:8080",

    HTTPS_PROXY: "http://proxy.local:8443",

    http_proxy: "http://proxy.local:8080",

    https_proxy: "http://proxy.local:8443",

  };

  return spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local", ...extraArgs], {

    cwd: projectDir,

    env,

    encoding: "utf8",

  });

}



test("k6-tools: môi trường proxy được điều khiển đúng ở mặc định, --proxy và --proxy=false", () => {
  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");

  const projectDir = mkTempDir("uk6-proxy-env-");



  try {

    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");



    const defaultCapture = path.join(projectDir, "default.json");

    const defaultRun = runWithArgs(runJs, projectDir, [], defaultCapture);

    assert.equal(defaultRun.status, 0, `${defaultRun.stdout || ""}\n${defaultRun.stderr || ""}`);

    const defaultEnv = JSON.parse(fs.readFileSync(defaultCapture, "utf8"));

    assert.equal(defaultEnv.NO_PROXY, "*");

    assert.equal(defaultEnv.HTTP_PROXY, undefined);

    assert.equal(defaultEnv.HTTPS_PROXY, undefined);



    const proxyCapture = path.join(projectDir, "proxy.json");

    const proxyRun = runWithArgs(runJs, projectDir, ["--proxy"], proxyCapture);

    assert.equal(proxyRun.status, 0, `${proxyRun.stdout || ""}\n${proxyRun.stderr || ""}`);

    const proxyEnv = JSON.parse(fs.readFileSync(proxyCapture, "utf8"));

    assert.equal(proxyEnv.HTTP_PROXY, "http://proxy.local:8080");

    assert.equal(proxyEnv.HTTPS_PROXY, "http://proxy.local:8443");

    assert.notEqual(proxyEnv.NO_PROXY, "*");



    const noProxyCapture = path.join(projectDir, "no-proxy.json");

    const noProxyRun = runWithArgs(runJs, projectDir, ["--proxy=false"], noProxyCapture);
    assert.equal(noProxyRun.status, 0, `${noProxyRun.stdout || ""}\n${noProxyRun.stderr || ""}`);
    const noProxyEnv = JSON.parse(fs.readFileSync(noProxyCapture, "utf8"));
    assert.equal(noProxyEnv.NO_PROXY, "*");
    assert.equal(noProxyEnv.HTTP_PROXY, undefined);
    assert.equal(noProxyEnv.HTTPS_PROXY, undefined);
  } finally {

    fs.rmSync(projectDir, { recursive: true, force: true });

  }

});

