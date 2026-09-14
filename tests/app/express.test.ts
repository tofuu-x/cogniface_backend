import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";

import env from "../../src/config/env.js";
import app from "../../src/app/express.js";

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const address = server.address();
  assert(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("unknown API routes return the standard 404 response", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Route not found",
  });
});

test("protected API routes reject requests without a bearer token", async () => {
  const response = await fetch(`${baseUrl}/api/attendance/my`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Authentication required",
  });
});

test("protected API routes reject an invalid bearer token", async () => {
  const response = await fetch(`${baseUrl}/api/course`, {
    headers: {
      authorization: "Bearer not-a-valid-jwt",
    },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Invalid or expired token",
  });
});

test("configured frontend origins receive CORS headers", async () => {
  const origin = env.client_origin?.split(",")[0]?.trim() || "http://localhost:5173";
  const response = await fetch(`${baseUrl}/api/does-not-exist`, {
    headers: { origin },
  });

  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("CORS preflight requests are handled without reaching a route", async () => {
  const origin = env.client_origin?.split(",")[0]?.trim() || "http://localhost:5173";
  const response = await fetch(`${baseUrl}/api/attendance/my`, {
    method: "OPTIONS",
    headers: {
      origin,
      "access-control-request-method": "GET",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.match(response.headers.get("access-control-allow-methods") || "", /GET/);
});

test("unconfigured origins do not receive an allow-origin header", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`, {
    headers: { origin: "https://untrusted.example" },
  });

  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("login validates required fields before accessing the database", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "student@example.com" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Username and password are required",
  });
});

test("password reset rejects passwords that do not match", async () => {
  const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: "unused-token",
      newPassword: "new-password",
      confirmPassword: "different-password",
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Passwords do not match",
  });
});

test("password reset rejects passwords shorter than eight characters", async () => {
  const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: "unused-token",
      newPassword: "short",
      confirmPassword: "short",
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Password must be at least 8 characters",
  });
});
