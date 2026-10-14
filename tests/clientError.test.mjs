import assert from "node:assert/strict";
import test from "node:test";
import handler from "../netlify/functions/client-error.mjs";

const event = { code: "runtime", source: "render", route: "/article/:id", browser: "Chromium", build: "test", at: "2026-10-14T00:00:00Z" };
const request = (body, origin = "https://magazine.unframe.kr") => new Request("https://magazine.unframe.kr/api/client-error", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body,
});

test("error collector accepts bounded diagnostic metadata, never arbitrary posted fields", async () => {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    assert.equal((await handler(request(JSON.stringify({ ...event, accessToken: "never-log" })))).status, 204);
    assert.equal(logged.length, 1);
    assert.ok(!JSON.stringify(logged).includes("never-log"));
  } finally { console.error = original; }
});

test("error collector rejects cross-origin, malformed and oversized payloads", async () => {
  assert.equal((await handler(request(JSON.stringify(event), "https://another.example"))).status, 403);
  assert.equal((await handler(request("{"))).status, 400);
  assert.equal((await handler(request(JSON.stringify({ ...event, source: 1 })))).status, 400);
  assert.equal((await handler(request("x".repeat(2049)))).status, 413);
});
