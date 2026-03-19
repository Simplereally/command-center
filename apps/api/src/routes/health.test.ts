import { describe, it, expect } from "vitest";
import { createApp } from "../app.js";

const app = createApp();

interface HealthResponse {
  data: {
    status: string;
    timestamp: number;
    uptime: number;
  };
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

describe("GET /api/v1/health", () => {
  it("returns 200 with status, timestamp, and uptime", async () => {
    const res = await app.request("/api/v1/health");

    expect(res.status).toBe(200);

    const json = (await res.json()) as HealthResponse;
    expect(json).toEqual({
      data: {
        status: "ok",
        timestamp: expect.any(Number),
        uptime: expect.any(Number),
      },
    });
  });

  it("returns a recent timestamp", async () => {
    const before = Date.now();
    const res = await app.request("/api/v1/health");
    const after = Date.now();

    const json = (await res.json()) as HealthResponse;
    expect(json.data.timestamp).toBeGreaterThanOrEqual(before);
    expect(json.data.timestamp).toBeLessThanOrEqual(after);
  });

  it("returns a non-negative uptime", async () => {
    const res = await app.request("/api/v1/health");
    const json = (await res.json()) as HealthResponse;

    expect(json.data.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe("404 handling", () => {
  it("returns 404 with NOT_FOUND error for unknown routes", async () => {
    const res = await app.request("/api/v1/nonexistent");

    expect(res.status).toBe(404);

    const json = (await res.json()) as ErrorResponse;
    expect(json).toEqual({
      error: {
        code: "NOT_FOUND",
        message: expect.stringContaining("not found"),
      },
    });
  });

  it("includes the method and path in the 404 message", async () => {
    const res = await app.request("/api/v1/does-not-exist");
    const json = (await res.json()) as ErrorResponse;

    expect(json.error.message).toContain("GET");
    expect(json.error.message).toContain("/api/v1/does-not-exist");
  });
});
