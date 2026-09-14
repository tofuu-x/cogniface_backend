import assert from "node:assert/strict";
import { test } from "node:test";

import { AppError } from "../../src/utils/appError.js";

test("stores an HTTP status and message", () => {
  const error = new AppError("Not found", 404);

  assert(error instanceof Error);
  assert.equal(error.message, "Not found");
  assert.equal(error.statusCode, 404);
  assert.equal(error.details, undefined);
});

test("stores optional validation details", () => {
  const details = { field: "email" };
  const error = new AppError("Invalid input", 400, details);

  assert.deepEqual(error.details, details);
});
