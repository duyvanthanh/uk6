import test from "node:test";

import assert from "node:assert/strict";

import {

  AuthUtils,

  DataUtils,

  StringUtils,

  createK6HttpClient,

  parseJsonSafe,

  pickFirst,

} from "../src/k6";



test("k6 entrypoint exports generic core helpers", () => {

  assert.equal(AuthUtils.createBasicAuth("client", "secret"), "Y2xpZW50OnNlY3JldA==");

  assert.match(StringUtils.generateClientMessageId(), /^[0-9a-f-]{36}$/i);

  assert.equal(DataUtils.buildFormBody({ grant_type: "client_credentials" }), "grant_type=client_credentials");

  assert.deepEqual(parseJsonSafe('{"ok":true}'), { ok: true });

  assert.equal(pickFirst({ data: { token: "t1" } }, ["token", "data.token"]), "t1");

});



test("k6 http client adapts k6/http style module", () => {

  const calls: Array<{ method: string; url: string; body?: unknown; params?: unknown }> = [];

  const http = {

    get: (url: string, params: unknown) => {

      calls.push({ method: "GET", url, params });

      return { status: 200, body: "{}", json: () => ({}) };

    },

    post: (url: string, body: unknown, params: unknown) => {

      calls.push({ method: "POST", url, body, params });

      return { status: 200, body: "{}", json: () => ({}) };

    },

  };



  const client = createK6HttpClient(http);

  client.get("http://localhost/users", { params: { page: 1 } });

  client.postJson("http://localhost/users", { name: "A" });

  client.postForm("http://localhost/token", { grant_type: "client_credentials" });



  assert.equal(calls[0]?.url, "http://localhost/users?page=1");

  assert.equal(calls[1]?.body, "{\"name\":\"A\"}");

  assert.equal(calls[2]?.body, "grant_type=client_credentials");

});

