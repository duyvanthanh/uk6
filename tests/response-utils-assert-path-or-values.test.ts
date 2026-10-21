import test from "node:test";

import assert from "node:assert/strict";

import { assertPath } from "../src/k6-framework/utils/response-utils";



test("assertPath: OR values pass when resolved value matches one candidate", () => {

  const res = {

    body: JSON.stringify({

      result: {

        responseCode: "01",

      },

    }),

  };



  assert.equal(assertPath("result.responseCode", ["00", "01", "02"]).condition(res), true);

});



test("assertPath: OR values fail when resolved value matches no candidate", () => {

  const res = {

    body: JSON.stringify({

      result: {

        responseCode: "99",

      },

    }),

  };



  assert.equal(assertPath("result.responseCode", ["00", "01", "02"]).condition(res), false);

});



test("assertPath: OR values support path fallback arrays", () => {

  const res = {

    body: JSON.stringify({

      response: {

        code: "01",

      },

    }),

  };



  assert.equal(assertPath(["result.responseCode", "response.code"], ["00", "01"]).condition(res), true);

});



test("assertPath: OR values prefer provided data over parsing response body", () => {

  const check = assertPath("result.responseCode", ["00", "01"]);

  const res: any = { body: "NOT_JSON" };

  const data = { result: { responseCode: "01" } };



  assert.equal(check.condition(res, data), true);

});



test("assertPath: OR values can match primitive falsy values", () => {

  const res = {

    body: JSON.stringify({

      result: {

        responseCode: 0,

      },

    }),

  };



  assert.equal(assertPath("result.responseCode", [0, 1]).condition(res), true);

});

