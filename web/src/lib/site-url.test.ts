import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSiteUrl, resolveSiteUrl } from "./site-url.ts";

test("resolveSiteUrl prefers NEXT_PUBLIC_SITE_URL", () => {
  assert.equal(
    resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://www.turkexpatlar.de",
      SITE_URL: "https://example.com",
      NODE_ENV: "production",
    }),
    "https://www.turkexpatlar.de",
  );
});

test("resolveSiteUrl falls back to SITE_URL", () => {
  assert.equal(
    resolveSiteUrl({
      SITE_URL: "https://www.turkexpatlar.de",
      NODE_ENV: "production",
    }),
    "https://www.turkexpatlar.de",
  );
});

test("resolveSiteUrl uses production default when env unset", () => {
  assert.equal(
    resolveSiteUrl({ NODE_ENV: "production" }),
    "https://www.turkexpatlar.de",
  );
});

test("resolveSiteUrl uses localhost in development", () => {
  assert.equal(
    resolveSiteUrl({ NODE_ENV: "development" }),
    "http://localhost:3200",
  );
});

test("normalizeSiteUrl strips trailing slashes", () => {
  assert.equal(
    normalizeSiteUrl("https://www.turkexpatlar.de/"),
    "https://www.turkexpatlar.de",
  );
});
