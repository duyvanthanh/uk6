# uk6

A k6 toolkit with HTTP helpers, reusable flows and scenarios, CSV inputs, response assertions, a script bundler, a runner, and HTML dashboards.

## Requirements

- Node.js 22 or newer and npm.
- Dependency downloads use the internal Nexus registry configured in `.npmrc`.
- A k6 executable on `PATH`, or a project-local `k6/k6.exe` on Windows. The executable is installed separately.
- SQL scenarios optionally use a k6 build with the appropriate `k6/x/sql` extension and driver. HTTP tests do not need database drivers.

## Build and verify

```sh
npm ci
npm run typecheck
npm test
```

`npm test` builds CommonJS and ESM output and runs the test suite. Functional tests use a local mock HTTP server and skip when k6 is unavailable.

## Run a test

Create `tests/load.js` in your consumer project:

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { createK6HttpClient } from 'uk6/k6';

const client = createK6HttpClient(http);
export const options = { vus: 1, duration: '10s' };

export default function () {
  const response = client.get(`${__ENV.BASE_URL}/health`);
  check(response, { 'status is 200': (res) => res.status === 200 });
  sleep(1);
}
```

Set `BASE_URL` to your test server, then run:

```sh
npx uk6 tests/load.js --dashboard -- -e BASE_URL=http://localhost:8080
npx uk6 --help
```

From this source checkout, use `npm run k6:run -- <script> [options]` after building. The runner bundles scripts into `.k6-build/` and forwards k6 arguments. Environment variables for runner configuration use the `UK6_` prefix.

## Package exports

- `uk6` or `uk6/k6`: HTTP adapter and generic helpers for encoding, data, forms, objects, and responses.
- `uk6/core`: runtime-independent helpers, including Basic auth encoding.
- `uk6/k6-framework`: endpoints, flows, scenarios, extractors, assertions, CSV inputs, metrics, and optional SQL steps.
- `uk6/k6-tools`: Node.js bundling and dashboard utilities.

For shared-folder execution across multiple load generators, see the [distributed runner guide](docs/k6-shared-folder-distributed-runner.md).

