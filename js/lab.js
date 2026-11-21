// lab.js — painel de roteiro manual: digita uma sequência e o PDA a processa
// símbolo por símbolo, em animação. Usa um PDA próprio e NÃO altera a partida.

const STEP_MS = 700;

function initLab(onState, game) {
  let timer = null;

  function renderMonitor(state, symbol, stackTopFirst, input, pos, bad) {
    $("labState").textContent = state; $("labSymbol").textContent = symbol;
    const st = $("labStack"); st.innerHTML = "";
    stackTopFirst.forEach((tk, i) => { const s = document.createElement("span"); s.className = "stack-token mini" + (tk === "Z" ? " base-token" : tk === "K" ? " key-token" : "") + (i === 0 ? " top" : ""); s.textContent = tk; st.append(s); });
    const inp = $("labInput"); inp.innerHTML = "";
    [...input].forEach((ch, i) => { const s = document.createElement("span"); s.textContent = ch;
      s.className = i < pos ? "done" : i === pos ? (bad ? "bad" : "now") : ""; inp.append(s); });
    if (!input) inp.textContent = "∅";
    onState?.(state);
  }

  function runOnScreen(seq, res) {                      // o personagem executa o roteiro no mapa
    const list = $("traceList"), out = $("manualResult");
    list.innerHTML = ""; out.className = "manual-result"; out.textContent = "Executando na tela do jogo…";
    $("labStatus").textContent = "executando"; renderMonitor("q0", "—", ["Z"], seq, 0, false);
    $("introOverlay").classList.add("hidden");
    $("gameCanvas").scrollIntoView({ behavior: "smooth", block: "nearest" });
    const verdict = (accepted, text) => { out.className = "manual-result " + (accepted ? "accepted" : "rejected");
      out.textContent = (accepted ? "ACEITA — " : "REJEITADA — ") + text; $("labStatus").textContent = accepted ? "aceita" : "rejeitada"; };
    game.runScript(seq, {
      symbol(i, ch, r) {
        const li = document.createElement("li");
        if (r.ok) li.innerHTML = r.steps.map(s => `<b>${s.from} → ${s.to}</b> <code>${s.rule}</code> · pilha: ${s.stack.join(" ")}<br><small>${s.note}</small>`).join("<br>");
        else li.innerHTML = `<b>✕ ${ch}</b> negado pelo PDA<br><small>${r.reason}</small>`;
        list.append(li); li.scrollIntoView({ block: "nearest" });
        const v = r.view; renderMonitor(v.state, ch, v.stackTopFirst, seq, r.ok ? i + 1 : i, !r.ok);
      },
      done(info) {
        if (info.cancelled) { out.className = "manual-result"; out.textContent = "Execução interrompida."; $("labStatus").textContent = "parado"; }
        else if (info.rejectedAt !== undefined) verdict(false, info.reason);
        else if (info.limit) verdict(false, info.reason + " (O processamento formal no PDA continua válido: use a opção desmarcada para testar sequências longas.)");
        else verdict(res.accepted, res.reason);
      }
    });
  }

  function run(raw) {
    clearTimeout(timer);
    const seq = raw.replace(/\s+/g, "").toLowerCase();
    const res = COLHEITA.run(seq);                       // PDA novo a cada execução
    if ($("onScreen").checked && game) return runOnScreen(seq, res);
    const list = $("traceList"), out = $("manualResult");
    list.innerHTML = ""; out.className = "manual-result"; out.textContent = "Processando…";
    $("labStatus").textContent = "processando";
    let i = 0, consumed = 0;
    renderMonitor("q0", "—", ["Z"], seq, 0, false);
    const tick = () => {
      if (i < res.history.length) {
        const s = res.history[i];
        if (s.read !== "ε") consumed++;
        const li = document.createElement("li");
        li.innerHTML = `<b>${s.from} → ${s.to}</b> <code>${s.rule}</code> · pilha: ${s.stack.join(" ")}<br><small>${s.note}</small>`;
        list.append(li); li.scrollIntoView({ block: "nearest" });
        renderMonitor(s.to, s.read, s.stack, seq, consumed, false);
        i++; timer = setTimeout(tick, STEP_MS);
      } else {
        out.className = "manual-result " + (res.accepted ? "accepted" : "rejected");
        out.textContent = (res.accepted ? "ACEITA — " : "REJEITADA — ") + res.reason;
        $("labStatus").textContent = res.accepted ? "aceita" : "rejeitada";
        if (!res.accepted) renderMonitor(res.finalState, res.unknown ? "?" : "✕", res.stack, seq, res.rejectedAt ?? consumed, true);
      }
    };
    if (!res.history.length) tick(); else timer = setTimeout(tick, 250);
  }

  $("manualForm").addEventListener("submit", e => { e.preventDefault(); run($("manualInput").value); });
  document.querySelectorAll("[data-sequence]").forEach(b => b.addEventListener("click", () => { $("manualInput").value = b.dataset.sequence; run(b.dataset.sequence); }));

  // Exemplos (os 4 casos obrigatórios) gerados a partir de tests.js
  const box = $("exampleButtons"); box.innerHTML = "";
  REQUIRED_CASES.forEach(t => {
    const b = document.createElement("button"); b.type = "button"; b.dataset.sequence = t.seq; b.title = t.why;
    b.className = "example-button " + (t.accept ? "accepted" : "rejected");
    b.innerHTML = `${t.seq} <small>${t.accept ? "aceita" : "rejeitada"}</small>`;
    b.addEventListener("click", () => { $("manualInput").value = t.seq; run(t.seq); });
    box.append(b);
  });

  // Suíte completa
  $("suiteButton").textContent = `Executar suíte completa (${ALL_CASES.length} casos)`;
  $("suiteButton").addEventListener("click", () => {
    const rows = runSuite(COLHEITA), body = $("suiteBody"); body.innerHTML = "";
    rows.forEach(r => {
      const tr = document.createElement("tr"); tr.className = r.ok ? "pass" : "fail";
      tr.innerHTML = `<td><code>${r.seq || "∅"}</code></td><td>${r.accept ? "aceita" : "rejeitada"}</td><td>${r.got ? "aceita" : "rejeitada"}</td><td>${r.ok ? "✓" : "✗"}</td>`;
      tr.title = r.reason; body.append(tr);
    });
    $("suiteSummary").textContent = `${rows.filter(r => r.ok).length}/${rows.length} casos conforme o esperado`;
    $("suiteTable").classList.remove("hidden");
  });
}
