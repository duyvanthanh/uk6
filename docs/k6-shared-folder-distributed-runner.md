# Shared-Folder “Distributed k6” Runner (How to Run)



This document describes the current shared-folder distributed runner implemented in `uk6`.



- Initiator machine runs `uk6` with `--distributed=<shared_folder>`.

- Listener machine(s) run a polling process watching the shared folder and running the same `uk6` command at the scheduled start time.

- This is **not true sharding**: every listener runs the same test (duplicate load) to reach higher total VUs.



## Quick start



### 1) Choose a shared folder

All machines must be able to read/write the same path, for example:



- Windows SMB: `\\server\share\k6-dist`

- Local path (for testing only): `D:\tmp\k6-dist`



### 2) Start one listener on each load generator machine

From the repo root on the listener machine:



```bash

npm run k6:run-distributed-listener -- --distributed="\\server\share\k6-dist"

```



Options:

- `--poll-ms=<ms>` (default `1000`, min `250`)

- `--node-id=<id>` (default `<hostname>-<pid>`)

- `--once` (scan once then exit)

- `--debug`



### 3) Start the distributed run from the initiator machine

From the repo root on the initiator machine:



```bash

npm run k6:run -- tests/load.js --env=sit --dashboard=true --distributed="\\server\share\k6-dist"

```



What happens:

- Initiator writes a request JSON to the shared folder with a scheduled start time.

- Initiator and listeners build the script, wait until the start time, then run together.

- Each machine uploads its own report artifacts back to the shared folder.

- The initiator also collects all node reports from the shared folder into its local `dashboard-report/` (best-effort).



## Initiator flags



Use these flags together with the normal `uk6` flags (like `--env=...`, `--dashboard=true`, `--vus`, `--duration`, etc).



- `--distributed=<shared_folder>` enables shared-folder distributed mode

- `--distributed-delay-ms=<ms>` start offset (default `30000`)

- `--distributed-cleanup-after-ms=<ms>` request TTL after start time (default `60000`)

- `--distributed-run-id=<id>` stable run ID (optional; auto-generated if missing)

- `--distributed-node-id=<id>` override node ID used in report folder naming (optional)



## Listener flags



Listener CLI:



```bash

npm run k6:run-distributed-listener -- --distributed="\\server\share\k6-dist"

```



Flags:

- `--distributed=<shared_folder>` (required)

- `--poll-ms=<ms>` (default `1000`, min `250`)

- `--node-id=<id>` (optional)

- `--runner-js=<path>` (optional)

- `--once` (optional)

- `--debug` (optional)



## Shared folder layout (current)



Under `<shared_folder>/.uk6-distributed/`:



```

requests/

  <runId>.json

runs/

  <runId>/

    nodes/

      <nodeId>/

        status.json

reports/

  <runId>/

    <nodeId>/

      meta.json

      error_log.json

      dashboard-report/

        api_dashboard.html

        error_log.raw.json

        error_log.raw.js

```



## Cleanup behavior (60s default)



The request JSON includes:

- `startAtEpochMs`

- `expiresAtEpochMs = startAtEpochMs + distributedCleanupAfterMs`



Cleanup is performed by the **listener**:

- During polling, the listener deletes any request JSON whose `expiresAtEpochMs` is in the past.

- If no listener is running, nothing will delete request files.



Additionally, on startup the listener will delete any `runs/<runId>`, `reports/<runId>`, and `workspaces/<runId>` folders whose last modified time is **older than 1 day** (best-effort).



## Local report collection on the initiator



After the initiator finishes its own run, it tries to copy all shared reports for the run into:



`./dashboard-report/distributed/<runId>/...`



## Final composed report (combined across agents)



When you run with `--dashboard=true` and `--distributed=...`, the initiator will compose a **combined** dashboard using raw logs from all nodes and write it to:



- `./dashboard-report/api_dashboard.html` (combined across agents)



It also keeps:

- `./dashboard-report/api_dashboard.local.html` (initiator-only run)

- `./dashboard-report/api_dashboard.distributed.html` (copy of the combined dashboard)

- `./dashboard-report/error_log.raw.distributed.json` (merged raw log array used to generate the combined dashboard)



## Constraints / assumptions



- All machines can read/write the same shared folder (SMB/NFS).

- Each machine has Node.js and k6 installed, and can reach the SUT.

- Start time coordination relies on clocks being reasonably close (NTP recommended).

