/* Prism API Tester · core logic (browser + Node) */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== "undefined" ? self : this, function () {
  const interpolate = (s, vars = {}) => String(s ?? "").replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  function parseKV(text) {
    return String(text || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.search(/[:=]/); return i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });
  }
  function build(req, vars = {}) {
    const url = new URL(interpolate(req.url, vars));
    for (const [k, v] of parseKV(req.params)) url.searchParams.append(interpolate(k, vars), interpolate(v, vars));
    const headers = {};
    for (const [k, v] of parseKV(req.headers)) headers[interpolate(k, vars)] = interpolate(v, vars);
    if (req.auth?.type === "bearer" && req.auth.token) headers.Authorization = `Bearer ${interpolate(req.auth.token, vars)}`;
    if (req.auth?.type === "basic" && req.auth.user) headers.Authorization = "Basic " + btoa(`${interpolate(req.auth.user, vars)}:${interpolate(req.auth.pass || "", vars)}`);
    let body;
    if (!["GET", "HEAD"].includes(req.method) && req.body && req.body.trim()) {
      body = interpolate(req.body, vars);
      if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) headers["Content-Type"] = /^\s*[[{]/.test(body) ? "application/json" : "text/plain";
    }
    return { method: req.method, url: url.toString(), headers, body };
  }
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  function toCurl(r) {
    return [`curl -X ${r.method} ${q(r.url)}`, ...Object.entries(r.headers).map(([k, v]) => `  -H ${q(`${k}: ${v}`)}`), r.body ? `  --data ${q(r.body)}` : null].filter(Boolean).join(" \\\n");
  }
  function toFetch(r) {
    const opts = { method: r.method, headers: r.headers };
    let s = `const res = await fetch(${JSON.stringify(r.url)}, {\n  method: ${JSON.stringify(r.method)},\n  headers: ${JSON.stringify(r.headers, null, 2).replace(/\n/g, "\n  ")},`;
    if (r.body) s += `\n  body: ${/json/.test(r.headers["Content-Type"] || "") ? `JSON.stringify(${safeJson(r.body)})` : JSON.stringify(r.body)},`;
    return s + `\n});\nconst data = await res.json();\nconsole.log(res.status, data);`;
  }
  const safeJson = (b) => { try { return JSON.stringify(JSON.parse(b), null, 2).replace(/\n/g, "\n  "); } catch { return JSON.stringify(b); } };
  function toPython(r) {
    let s = `import requests\n\nres = requests.request(\n    ${JSON.stringify(r.method)},\n    ${JSON.stringify(r.url)},\n    headers=${JSON.stringify(r.headers)},`;
    if (r.body) s += /json/.test(r.headers["Content-Type"] || "") ? `\n    json=${pyLiteral(r.body)},` : `\n    data=${JSON.stringify(r.body)},`;
    return s + `\n)\nprint(res.status_code, res.json())`;
  }
  const pyLiteral = (b) => { try { return JSON.stringify(JSON.parse(b)).replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None"); } catch { return JSON.stringify(b); } };
  function tokenize(cmd) {
    const out = []; let cur = "", q = null, has = false;
    cmd = cmd.replace(/\\\r?\n/g, " ");
    for (let i = 0; i < cmd.length; i++) {
      const c = cmd[i];
      if (q) { if (c === q) q = null; else if (c === "\\" && q === '"') cur += cmd[++i]; else cur += c; }
      else if (c === "'" || c === '"') { q = c; has = true; }
      else if (/\s/.test(c)) { if (cur || has) out.push(cur); cur = ""; has = false; }
      else if (c === "\\") cur += cmd[++i] ?? "";
      else cur += c;
    }
    if (cur || has) out.push(cur);
    return out;
  }
  function fromCurl(cmd) {
    const t = tokenize(cmd.trim());
    if (t[0] !== "curl") throw new Error("Command must start with curl");
    const req = { method: "GET", url: "", headers: "", params: "", body: "" }; const hs = [];
    for (let i = 1; i < t.length; i++) {
      const a = t[i];
      if (a === "-X" || a === "--request") req.method = t[++i].toUpperCase();
      else if (a === "-H" || a === "--header") hs.push(t[++i]);
      else if (["-d", "--data", "--data-raw", "--data-binary", "--json"].includes(a)) { req.body = t[++i]; if (req.method === "GET") req.method = "POST"; if (a === "--json") hs.push("Content-Type: application/json"); }
      else if (a === "-u" || a === "--user") hs.push("Authorization: Basic " + btoa(t[++i]));
      else if (a.startsWith("-")) { if (["-o", "-A", "--user-agent", "-e", "-b", "--cookie"].includes(a)) i++; }
      else if (!req.url) req.url = a;
    }
    req.headers = hs.map((h) => h.replace(/^\s*([^:]+):\s*/, "$1: ")).join("\n");
    return req;
  }
  function prettySize(n) { return n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(2) + " MB"; }
  function statusClass(s) { return s >= 500 ? "bad" : s >= 400 ? "warn" : s >= 300 ? "acc" : s >= 200 ? "ok" : "bad"; }
  return { interpolate, parseKV, build, toCurl, toFetch, toPython, fromCurl, tokenize, prettySize, statusClass };
});
