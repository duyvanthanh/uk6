import test from "node:test";

import assert from "node:assert/strict";

import { assertResponseTime } from "../src/k6-framework/utils/response-utils";



test("assertResponseTime: returns false when timings missing", () => {

  const check = assertResponseTime(100);

  assert.equal(check.condition({}), false);

});



test("assertResponseTime: passes when duration <= max", () => {

  const check = assertResponseTime(100);

  assert.equal(check.condition({ timings: { duration: 99.9 } }), true);

  assert.equal(check.condition({ timings: { duration: 100 } }), true);

});



test("assertResponseTime: fails when duration > max", () => {

  const check = assertResponseTime(100);

  assert.equal(check.condition({ timings: { duration: 100.0001 } }), false);

});



