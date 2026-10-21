import test from "node:test";

import assert from "node:assert/strict";

import { assertPath } from "../src/k6-framework/utils/response-utils";



test("assertPath: ưu tiên dùng parsed data được truyền vào thay vì parse lại res.body", () => {

  const check = assertPath("result.responseCode", "00");

  const res: any = { body: "NOT_JSON" };

  const data = { result: { responseCode: "00" } };

  assert.equal(check.condition(res, data), true);

});



