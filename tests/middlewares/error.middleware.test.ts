import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { errorMiddleware } from "../../src/middlewares/error.middleware.js";

const handleError = (error: Error) => {
  let statusCode: number | undefined;
  let body: unknown;

  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as unknown as Response;

  errorMiddleware(
    error,
    {} as Request,
    response,
    (() => undefined) as NextFunction
  );

  return { statusCode, body };
};

test("returns a conflict for Prisma foreign-key constraint errors", () => {
  const error = Object.assign(
    new Error("Foreign key constraint failed"),
    { code: "P2003" }
  );

  assert.deepEqual(handleError(error), {
    statusCode: 409,
    body: {
      success: false,
      message:
        "This record cannot be deleted because it is still referenced by other data",
    },
  });
});

test("returns not found for Prisma missing-record errors", () => {
  const error = Object.assign(
    new Error("Record not found"),
    { code: "P2025" }
  );

  assert.deepEqual(handleError(error), {
    statusCode: 404,
    body: {
      success: false,
      message: "Record not found",
    },
  });
});
