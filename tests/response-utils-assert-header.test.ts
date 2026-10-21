import test from "node:test";

import assert from "node:assert/strict";

import { assertHeader } from "../src/k6-framework/utils/response-utils";



test("assertHeader: so khớp header cơ bản", () => {

  const res = { headers: { "content-type": "application/json", "x-request-id": "req-1" } };

  assert.equal(assertHeader("content-type", "application/json").condition(res), true);

  assert.equal(assertHeader("x-request-id", "req-1").condition(res), true);

  assert.equal(assertHeader("x-request-id", "req-2").condition(res), false);

});



test("assertHeader: key header không phân biệt hoa thường", () => {

  const res = { headers: { "Content-Type": "application/json", "X-Custom-Id": "abc123" } };

  assert.equal(assertHeader("content-type", "application/json").condition(res), true);

  assert.equal(assertHeader("CONTENT-TYPE", "application/json").condition(res), true);

  assert.equal(assertHeader("x-custom-id", "abc123").condition(res), true);

});



test("assertHeader: hỗ trợ path lồng nhau trong object header mock", () => {

  const res = {

    headers: {

      "x-meta": {

        nested: {

          token: "value-1",

        },

      },

    },

  };

  assert.equal(assertHeader("x-meta.nested.token", "value-1").condition(res), true);

  assert.equal(assertHeader("x-meta.nested.token", "value-2").condition(res), false);

});



test("assertHeader: nhánh một tham số kiểm tra truthy", () => {

  const res = {

    headers: {

      "x-token": "abc",

      "x-zero": 0,

      "x-false": false,

      "x-empty": "",

      "x-null": null,

    },

  };

  assert.equal(assertHeader("x-token").condition(res), true);

  assert.equal(assertHeader("x-zero").condition(res), false);

  assert.equal(assertHeader("x-false").condition(res), false);

  assert.equal(assertHeader("x-empty").condition(res), false);

  assert.equal(assertHeader("x-null").condition(res), false);

  assert.equal(assertHeader("x-missing").condition(res), false);

});

