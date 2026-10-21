import test from "node:test";

import assert from "node:assert/strict";

import { assertPathByRegex } from "../src/k6-framework/utils/response-utils";



test("assertPathByRegex: passes with a single regex string", () => {

  const res = {

    body: JSON.stringify({

      result: {

        responseCode: "01",

      },

    }),

  };



  assert.equal(assertPathByRegex("result.responseCode", "^0[01]$").condition(res), true);

});



test("assertPathByRegex: fails when the regex does not match", () => {

  const res = {

    body: JSON.stringify({

      result: {

        responseCode: "99",

      },

    }),

  };



  assert.equal(assertPathByRegex("result.responseCode", "^0[01]$").condition(res), false);

});



test("assertPathByRegex: list of regex patterns works as OR", () => {

  const res = {

    body: JSON.stringify({

      response: {

        code: "99",

      },

    }),

  };



  assert.equal(assertPathByRegex(["result.responseCode", "response.code"], ["^0[01]$", "^99$"]).condition(res), true);

});



test("assertPathByRegex: uses provided data instead of reparsing body", () => {

  const check = assertPathByRegex("result.responseCode", "^0[01]$");

  const res: any = { body: "NOT_JSON" };

  const data = { result: { responseCode: "01" } };



  assert.equal(check.condition(res, data), true);

});



test("assertPathByRegex: coerces non-string values before matching", () => {

  const res = {

    body: JSON.stringify({

      result: {

        responseCode: 200,

      },

    }),

  };



  assert.equal(assertPathByRegex("result.responseCode", "^20+$").condition(res), true);

});



test("assertPathByRegex: missing or null value fails", () => {

  const missingRes = { body: JSON.stringify({ result: {} }) };

  const nullRes = { body: JSON.stringify({ result: { responseCode: null } }) };



  assert.equal(assertPathByRegex("result.responseCode", "^00$").condition(missingRes), false);

  assert.equal(assertPathByRegex("result.responseCode", "^00$").condition(nullRes), false);

});



test("assertPathByRegex: invalid regex throws at builder creation time", () => {

  assert.throws(() => assertPathByRegex("result.responseCode", "["), SyntaxError);

});

