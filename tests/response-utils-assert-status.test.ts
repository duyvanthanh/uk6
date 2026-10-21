import test from "node:test";

import assert from "node:assert/strict";

import { assertStatus } from "../src/k6-framework/utils/response-utils";



test("assertStatus: pass với mã số cơ bản", () => {

  assert.equal(assertStatus(200).condition({ status: 200 }), true);

  assert.equal(assertStatus(201).condition({ status: 201 }), true);

});



test("assertStatus: fail với mã không khớp", () => {

  assert.equal(assertStatus(200).condition({ status: 401 }), false);

  assert.equal(assertStatus(201).condition({ status: 404 }), false);

  assert.equal(assertStatus(200).condition({ status: 501 }), false);

});



test("assertStatus: hỗ trợ mã dạng chuỗi", () => {

  assert.equal(assertStatus("200").condition({ status: 200 }), true);

  assert.equal(assertStatus("201").condition({ status: 201 }), true);

  assert.equal(assertStatus("404").condition({ status: 200 }), false);

});



test("assertStatus: chuỗi không hợp lệ sẽ fail an toàn", () => {

  assert.equal(assertStatus("abc").condition({ status: 200 }), false);

});

