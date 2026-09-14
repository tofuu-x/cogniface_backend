import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";

import env from "../../src/config/env.js";
import {
  comparePassword,
  generateJWT,
  hashPassword,
} from "../../src/utils/auth.js";

test("hashes passwords and compares them correctly", async () => {
  const hash = await hashPassword("simple-password");

  assert.notEqual(hash, "simple-password");
  assert.equal(await comparePassword("simple-password", hash), true);
  assert.equal(await comparePassword("wrong-password", hash), false);
});

test("generates a signed JWT with trusted user claims", () => {
  const token = generateJWT("user-1", "STUDENT", 2, {
    studentId: "STU-001",
  });
  const payload = jwt.verify(token, env.jwt_secret);

  assert.equal(typeof payload, "object");
  assert(payload && typeof payload === "object");
  assert.equal(payload.userId, "user-1");
  assert.equal(payload.role, "STUDENT");
  assert.equal(payload.authVersion, 2);
  assert.equal(payload.studentId, "STU-001");
});
