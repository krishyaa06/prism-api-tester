(() => {
  const { $, $$, copy, store, esc, debounce, tabs, toast } = Prism;
  const F = ["method", "url", "params", "headers", "body", "vars", "authType", "authToken", "authUser", "authPass"];
  const DEF = { method: "GET", url: "{{baseUrl}}/repos/krishyaa06/prism-ai", params: "", headers: "Accept: application/vnd.github+json", body: "", vars: "baseUrl=https://api.github.com", authType: "none" };
  let code = "curl", resView = "body", last = null, hist = store.get("api:hist", []);
  const st = store.get("api:req", DEF);
  F.forEach((k) => ($("#" + k).value = st[k] ?? ""));
  const req = () => Object.fromEntries(F.map((k) => [k, $("#" + k).value]));
  const vars = () => Object.fromEntries(Core.parseKV($("#vars").value));
  const built = () => { const r = req(); return Core.build({ ...r, auth: { type: r.authType, token: r.authToken, user: r.authUser, pass: r.authPass } }, vars()); };
  function hl(json) {
    return esc(json).replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (m, s, c, b) => s ? `<span class="${c ? "k" : "s"}">${s}</span>${c || ""}` : b ? `<span class="b">${m}</span>` : m === "null" ? '<span class="z">null</span>' : `<span class="n">${m}</span>`);
  }
  function renderCode() {
    store.set("api:req", req());
    try { const b = built(); $("#code").textContent = code === "fetch" ? Core.toFetch(b) : code === "python" ? Core.toPython(b) : Core.toCurl(b); }
    catch (e) { $("#code").textContent = "Enter a valid URL to generate code"; }
  }
  function showRes() {
    if (!last) return;
    if (last.error) { $("#res").innerHTML = `<span class="z">${esc(last.error)}</span>`; return; }
    if (resView === "headers") { $("#res").textContent = last.headers.map(([k, v]) => `${k}: ${v}`).join("\n"); return; }
    try { $("#res").innerHTML = hl(JSON.stringify(JSON.parse(last.text), null, 2)); } catch { $("#res").textContent = last.text || "(empty body)"; }
  }
  async function send() {
    let b; try { b = built(); } catch { return toast("Invalid URL"); }
    $("#send").disabled = true; $("#status").className = "pill"; $("#status").textContent = "Sending…"; $("#time").textContent = ""; $("#size").textContent = "";
    const t0 = performance.now();
    try {
      const res = await fetch(b.url, { method: b.method, headers: b.headers, body: b.body });
      const text = await res.text(); const ms = Math.round(performance.now() - t0);
      last = { status: res.status, text, headers: [...res.headers.entries()] };
      $("#status").className = "pill " + Core.statusClass(res.status); $("#status").textContent = `${res.status} ${res.statusText}`;
      $("#time").textContent = ms + " ms"; $("#size").textContent = Core.prettySize(new TextEncoder().encode(text).length);
      hist = [{ m: b.method, u: req().url, s: res.status, r: req() }, ...hist.filter((h) => h.u !== req().url || h.m !== b.method)].slice(0, 15); store.set("api:hist", hist); drawHist();
    } catch (e) {
      last = { error: `Request failed: ${e.message}. The server may block cross-origin (CORS) requests, or the URL is unreachable.` };
      $("#status").className = "pill bad"; $("#status").textContent = "Network error";
    }
    $("#send").disabled = false; showRes();
  }
  function drawHist() {
    $("#hist").innerHTML = hist.length ? hist.map((h, i) => `<button class="hi" data-i="${i}"><b>${h.m}</b><span>${esc(h.u)}</span><span class="pill ${Core.statusClass(h.s)}">${h.s}</span></button>`).join("") : '<div class="empty">Requests you send appear here</div>';
  }
  tabs($("#reqTabs"), (v) => $$("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== v)));
  tabs($("#codeTabs"), (v) => { code = v; renderCode(); });
  tabs($("#resTabs"), (v) => { resView = v; showRes(); });
  F.forEach((k) => $("#" + k).addEventListener("input", debounce(renderCode, 150)));
  $("#send").onclick = send;
  document.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); send(); } });
  $("#fmtBody").onclick = () => { try { $("#body").value = JSON.stringify(JSON.parse($("#body").value), null, 2); renderCode(); } catch { toast("Body is not valid JSON"); } };
  $("#copyCode").onclick = () => copy($("#code").textContent);
  $("#importCurl").onclick = () => { const c = prompt("Paste a cURL command"); if (!c) return; try { const r = Core.fromCurl(c); Object.entries(r).forEach(([k, v]) => $("#" + k) && ($("#" + k).value = v)); $("#params").value = ""; renderCode(); toast("cURL imported"); } catch (e) { toast(e.message); } };
  $("#hist").onclick = (e) => { const b = e.target.closest(".hi"); if (!b) return; const r = hist[b.dataset.i].r; F.forEach((k) => ($("#" + k).value = r[k] ?? "")); renderCode(); };
  $("#clearHist").onclick = () => { hist = []; store.set("api:hist", hist); drawHist(); };
  renderCode(); drawHist();
})();
