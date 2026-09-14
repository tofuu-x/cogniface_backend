import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { authorizeRoles } from "../../src/middlewares/authorizeRoles.middleware.js";
import { AppError } from "../../src/utils/appError.js";

const response = {} as Response;

const requestFor = (role: "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT") =>
  ({
    user: {
      userId: "user-1",
      role,
      authVersion: 0,
    },
  }) as unknown as Request;

test("allows a user with an accepted role", () => {
  let nextWasCalled = false;
  const next = (() => {
    nextWasCalled = true;
  }) as NextFunction;

  authorizeRoles("ADMIN", "SUPER_ADMIN")(requestFor("ADMIN"), response, next);

  assert.equal(nextWasCalled, true);
});

test("rejects a user whose role is not accepted", () => {
  assert.throws(
    () =>
      authorizeRoles("ADMIN")(
        requestFor("STUDENT"),
        response,
        (() => undefined) as NextFunction,
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 403 &&
      error.message === "You are not authorized to access this resource",
  );
});

test("rejects a request without an authenticated user", () => {
  assert.throws(
    () =>
      authorizeRoles("ADMIN")(
        {} as Request,
        response,
        (() => undefined) as NextFunction,
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 401 &&
      error.message === "Authentication required",
  );
});
