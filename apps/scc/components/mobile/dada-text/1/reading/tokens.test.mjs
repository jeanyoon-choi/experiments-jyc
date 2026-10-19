import assert from "node:assert/strict";
import test from "node:test";
import { splitTokens, textRole } from "./tokens.ts";

const plain = { bold: false, heading: false, interactive: false };
const texts = (run) => splitTokens(run).map((token) => token.text);

test("a handle and the time since posting are two parts, the dot between them neither", () => {
  assert.deepEqual(texts("@adainmotion · 2m"), ["@adainmotion", "2m"]);
  assert.deepEqual(texts("· 3h"), ["3h"]);
  const [handle, time] = splitTokens("@ada · 2m");
  assert.equal("@ada · 2m".slice(handle.start, handle.end), "@ada");
  assert.equal("@ada · 2m".slice(time.start, time.end), "2m");
});

test("tags and mentions inside copy are their own parts", () => {
  assert.deepEqual(texts("Bread report #baking with @imani today"), ["Bread report", "#baking", "with", "@imani", "today"]);
});

test("roles are read from form before place", () => {
  assert.equal(textRole("@adainmotion", { ...plain, interactive: true }), "handle");
  assert.equal(textRole("2m", { ...plain, interactive: true }), "time");
  assert.equal(textRole("3 days ago", plain), "time");
  assert.equal(textRole("3 hours ago", plain), "time");
  assert.equal(textRole("14K", { ...plain, interactive: true }), "count");
  assert.equal(textRole("1.2M views", plain), "count");
  assert.equal(textRole("#baking", plain), "tag");
});

test("names, control labels and copy", () => {
  assert.equal(textRole("Ada Williams", { ...plain, bold: true, interactive: true }), "name");
  assert.equal(textRole("mara.k", { ...plain, interactive: true }), "name");
  assert.equal(textRole("jules_cooks", { ...plain, bold: true, interactive: true }), "name");
  assert.equal(textRole("Follow", { ...plain, bold: true, interactive: true }), "control");
  assert.equal(textRole("For you", { ...plain, bold: true, interactive: true }), "control");
  assert.equal(textRole("Bread report: loaf one, pale.", plain), "copy");
  assert.equal(textRole("Trending", { ...plain, heading: true }), "title");
});
