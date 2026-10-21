import test from "node:test";

import assert from "node:assert/strict";

import { assertPath } from "../src/k6-framework/utils/response-utils";



test("assertPath: nhánh một tham số pass khi path trả giá trị truthy", () => {

  const res = {

    body: JSON.stringify({

      a: {

        text: "hello",

        count: 7,

        nested: { ok: true },

      },

    }),

  };

  assert.equal(assertPath("a.text").condition(res), true);

  assert.equal(assertPath("a.count").condition(res), true);

  assert.equal(assertPath("a.nested").condition(res), true);

});



test("assertPath: nhánh một tham số fail khi path thiếu hoặc giá trị falsy", () => {

  const res = {

    body: JSON.stringify({

      a: {

        zero: 0,

        empty: "",

        nope: false,

        nil: null,

      },

    }),

  };

  assert.equal(assertPath("a.zero").condition(res), false);

  assert.equal(assertPath("a.empty").condition(res), false);

  assert.equal(assertPath("a.nope").condition(res), false);

  assert.equal(assertPath("a.nil").condition(res), false);

  assert.equal(assertPath("a.missing").condition(res), false);

});



test("assertPath: nhánh một tham số vẫn ưu tiên parsed data được truyền vào", () => {

  const check = assertPath("result.responseCode");

  const res: any = { body: "NOT_JSON" };

  const data = { result: { responseCode: "00" } };

  assert.equal(check.condition(res, data), true);

});

