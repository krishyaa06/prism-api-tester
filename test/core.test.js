const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/core.js");

test("builds request with variables, params and auth", () => {
  const r = C.build({ method: "POST", url: "{{base}}/users", params: "page=2\nq=prism dev", headers: "X-Id: {{id}}", body: '{"a":1}', auth: { type: "bearer", token: "{{tok}}" } }, { base: "https://api.x.dev", id: "7", tok: "abc" });
  assert.equal(r.url, "https://api.x.dev/users?page=2&q=prism+dev");
  assert.equal(r.headers["X-Id"], "7");
  assert.equal(r.headers.Authorization, "Bearer abc");
  assert.equal(r.headers["Content-Type"], "application/json");
});
test("GET drops body", () => {
  assert.equal(C.build({ method: "GET", url: "https://a.b", body: "x" }).body, undefined);
});
test("curl round trip", () => {
  const r = C.build({ method: "PUT", url: "https://a.b/x", headers: "Accept: application/json", body: `{"name":"it's"}` });
  const back = C.fromCurl(C.toCurl(r));
  assert.equal(back.method, "PUT"); assert.equal(back.url, "https://a.b/x");
  assert.equal(back.body, `{"name":"it's"}`);
  assert.match(back.headers, /Accept: application\/json/);
});
test("import a typical curl", () => {
  const r = C.fromCurl(`curl https://api.github.com/user -H "Authorization: Bearer t" -d '{"x":1}'`);
  assert.equal(r.method, "POST"); assert.equal(r.body, '{"x":1}');
  assert.throws(() => C.fromCurl("wget x"));
});
test("code generators", () => {
  const r = C.build({ method: "POST", url: "https://a.b", body: '{"ok":true,"n":null}' });
  assert.match(C.toFetch(r), /JSON\.stringify\(/);
  assert.match(C.toPython(r), /json=\{"ok":True,"n":None\}/);
});
test("helpers", () => {
  assert.equal(C.prettySize(2048), "2.0 KB");
  assert.equal(C.statusClass(404), "warn"); assert.equal(C.statusClass(201), "ok");
});
