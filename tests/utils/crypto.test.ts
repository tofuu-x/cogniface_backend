import assert from "node:assert/strict";
import { test } from "node:test";

import {
  generatePasswordToken,
  generateRandomNumber,
  generateTemporaryPassword,
  hashToken,
} from "../../src/utils/crypto.js";

test("creates a temporary password without unsafe URL characters", () => {
  const password = generateTemporaryPassword();

  assert.match(password, /^[A-Za-z0-9_-]{16}$/);
});

test("generates random numbers inside the requested range", () => {
  for (let index = 0; index < 20; index += 1) {
    const value = generateRandomNumber(100, 200);

    assert(value >= 100);
    assert(value < 200);
  }
});

test("hashes tokens consistently with SHA-256", () => {
  const firstHash = hashToken("example-token");

  assert.equal(firstHash, hashToken("example-token"));
  assert.notEqual(firstHash, hashToken("another-token"));
  assert.match(firstHash, /^[a-f0-9]{64}$/);
});

test("creates a password token and its matching hash", () => {
  const { rawToken, tokenHash } = generatePasswordToken();

  assert.match(rawToken, /^[a-f0-9]{64}$/);
  assert.equal(tokenHash, hashToken(rawToken));
});
