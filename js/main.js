// main.js — inicialização: liga o jogo à interface (DOM) e ao laboratório.

// Para mostrar o print do diagrama exportado do JFLAP, coloque a imagem em docs/ e informe o caminho aqui:
const JFLAP_IMAGE = null;   // ex.: "docs/jflap-diagrama.png"
const PHASE = { q0: ["Início", 0], q1: ["Coletando madeira", 14], q2: ["Reconstruindo a ponte", 30], q3: ["Ponte concluída", 45],
  q4: ["Coletando chaves", 60], q5: ["Abrindo o portão", 75], q6: ["Portão aberto", 90], q7: ["Aceitação", 100] };

function highlightState(id) {
  document.querySelectorAll("#pdaDiagram .st").forEach(g => g.classList.toggle("active", g.dataset.state === id));
}

const hooks = {
  pda(v, attempts) {
    const seq = attempts.map(x => x.ch).join("");
    $("currentState").textContent = v.state;
    $("currentSymbol").textContent = v.lastSymbol;
    const sv = $("sequenceView"); sv.innerHTML = "";
    attempts.forEach(x => { const s = document.createElement("span"); s.textContent = x.ch; if (!x.ok) { s.className = "bad"; s.title = "Negada pelo PDA"; } sv.append(s); });
    if (!attempts.length) sv.textContent = "∅";
    $("inputCount").textContent = `${attempts.length} ${attempts.length === 1 ? "símbolo" : "símbolos"}`;
    const stack = $("stackView"); stack.innerHTML = "";
    v.stack.forEach((tk, i) => {                       // fundo → topo (o CSS inverte a coluna)
      const el = document.createElement("span");
      el.className = "stack-token" + (tk === "Z" ? " base-token" : tk === "K" ? " key-token" : "") + (i === v.stack.length - 1 && tk !== "Z" ? " top" : "");
      el.textContent = tk; stack.append(el);
    });
    $("pdaExplanation").textContent = v.reason;
    const [label, pct] = PHASE[v.state]; $("phaseLabel").textContent = label; $("phaseFill").style.width = pct + "%";
    // Veredito formal: a sequência gerada inclui as tentativas negadas. Se o jogador vence mesmo assim,
    // a sequência EFETIVA (só o que o PDA aceitou) é ACEITA e o aviso explica as tentativas negadas.
    const vb = $("verdictBox"), res = seq ? COLHEITA.run(seq) : null;
    const eff = attempts.filter(x => x.ok).map(x => x.ch).join(""), denied = attempts.length - eff.length;
    const effRes = denied ? COLHEITA.run(eff) : res;
    const kind = !res ? "idle" : res.accepted || effRes.accepted ? "accepted" : res.endOfInput ? "running" : "rejected";
    vb.className = "verdict verdict-" + kind;
    vb.textContent = !res ? "Sem sequência ainda: cada ação do jogo gera um símbolo."
      : res.accepted ? "ACEITA — " + res.reason
      : effRes.accepted ? `ACEITA — a sequência efetiva ${eff} chegou a q7. As ${denied} tentativa(s) negada(s) não alteraram o autômato (com elas, a sequência completa seria rejeitada).`
      : res.endOfInput ? "EM ANDAMENTO — prefixo válido, mas incompleto. " + res.reason
      : "REJEITADA — " + res.reason + (denied ? " (a ação negada não alterou o PDA: você pode continuar ou apertar R para recomeçar)" : "");
    const b = $("statusBadge"), k = kind === "idle" ? "idle" : kind;
    b.className = "status-badge status-" + k;
    b.textContent = { accepted: "Aceita", rejected: "Rejeitada", running: "Em andamento", idle: "Aguardando" }[k];
    highlightState(v.state);
  },
  message(text, tone) { const m = $("gameMessage"); m.textContent = text; $("messageBox").dataset.tone = tone || "info"; },
  hud(h) { $("areaName").textContent = h.area; $("objective").textContent = h.objective; $("nearbyHint").textContent = h.nearby; },
  letter(open) { $("letterOverlay").classList.toggle("hidden", !open); },
  ending(seq) { $("endingOverlay").classList.toggle("hidden", !seq); if (seq) $("endingSequence").textContent = seq; },
  menu() { showScreen("screenMenu"); }
};

const game = new Game($("gameCanvas"), hooks, $("inventory"));
window.__game = game; // útil para depuração no console
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
  document.body.dataset.screen = id; window.scrollTo(0, 0);
  Sound.music(id === "screenGame");
}
function startMode(mode) {                 // mode: "play" | "sequence"
  document.body.dataset.mode = mode; game.setMode(mode);
  showScreen("screenGame");
  if (mode === "play") { game.reset(false); $("introOverlay").classList.remove("hidden"); }
  else { $("introOverlay").classList.add("hidden"); game.enterIdle(); $("manualInput").focus(); }
}
$("menuStart").addEventListener("click", () => showScreen("screenMode"));
$("menuSettings").addEventListener("click", () => showScreen("screenSettings"));
$("menuHelp").addEventListener("click", () => $("helpDialog").showModal());
$("modePlay").addEventListener("click", () => startMode("play"));
$("modeSequence").addEventListener("click", () => startMode("sequence"));
document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => {
  if (document.body.dataset.screen === "screenGame") game.reset(false);   // sai do jogo: cancela roteiro e limpa
  showScreen(b.dataset.goto);
}));
document.addEventListener("click", e => { if (e.target.closest("button")) Sound.play("click"); });

// Configurações geradas a partir de SETTINGS_SCHEMA (settings.js)
function buildSettings() {
  const box = $("settingsList"); box.innerHTML = "";
  SETTINGS_SCHEMA.forEach(def => {
    const row = document.createElement("label"); row.className = "set-row";
    const input = document.createElement("input"); const out = document.createElement("output");
    if (def.type === "toggle") { input.type = "checkbox"; input.checked = !!Settings.get(def.key); input.onchange = () => Settings.set(def.key, input.checked); }
    else { Object.assign(input, { type: "range", min: def.min, max: def.max, step: def.step, value: Settings.get(def.key) });
      out.textContent = Settings.get(def.key); input.oninput = () => { Settings.set(def.key, +input.value); out.textContent = input.value; }; }
    const name = document.createElement("span"); name.textContent = def.label;
    row.append(name, input, out); box.append(row);
  });
}
buildSettings();
$("soundTest").addEventListener("click", () => Sound.play("collect"));
$("settingsReset").addEventListener("click", () => { Settings.reset(); buildSettings(); });

$("startButton").addEventListener("click", () => { $("introOverlay").classList.add("hidden"); game.start(); });
$("restartButton").addEventListener("click", () => { game.reset(true); });
$("menuButton").addEventListener("click", () => game.backToMenu());
$("letterClose").addEventListener("click", () => game.interact());
$("helpButton").addEventListener("click", () => $("helpDialog").showModal());
initLab(highlightState, game);

// Diagrama de estados gerado da definição do PDA (fonte única de verdade).
function buildDiagram() {
  const X = i => 60 + i * 112, Y = 140, R = 26, pairs = new Map();
  COLHEITA.transitions.forEach(t => { const k = t.from + ">" + t.to; if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(`${t.read || "ε"},${t.pop}/${t.push || "ε"}`); });
  let h = '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5d6b5e"/></marker></defs>';
  h += `<path class="edge" d="M10,${Y} L${X(0) - R - 2},${Y}"/>`;
  pairs.forEach((labels, k) => {
    const [f, t] = k.split(">").map(s => +s.slice(1)), x = X(f);
    if (f === t) {
      h += `<path class="edge" d="M${x - 14},${Y - 24} C${x - 36},${Y - 82} ${x + 36},${Y - 82} ${x + 14},${Y - 24}"/>`;
      labels.forEach((l, i) => { h += `<text class="elabel" x="${x}" y="${Y - 90 - i * 14}">${l}</text>`; });
    } else {
      h += `<path class="edge" d="M${X(f) + R},${Y} L${X(t) - R},${Y}"/>`;
      labels.forEach((l, i) => { h += `<text class="elabel" x="${(X(f) + X(t)) / 2}" y="${Y - 10 - i * 14}">${l}</text>`; });
    }
  });
  COLHEITA.states.forEach((s, i) => {
    const fin = COLHEITA.finals.includes(s.id);
    h += `<g class="st${fin ? " final" : ""}" data-state="${s.id}"><circle cx="${X(i)}" cy="${Y}" r="${R}"/>${fin ? `<circle cx="${X(i)}" cy="${Y}" r="${R - 5}"/>` : ""}<text x="${X(i)}" y="${Y + 5}">${s.id}</text><text class="sn" x="${X(i)}" y="${Y + 48}">${s.name}</text></g>`;
  });
  $("pdaDiagram").innerHTML = h;
}
buildDiagram();
if (JFLAP_IMAGE) { const f = $("jflapFig"); f.classList.remove("hidden"); f.querySelector("img").src = JFLAP_IMAGE; }

// Tabela de transições gerada diretamente da definição do PDA (fonte única de verdade).
const rules = $("rulesBody");
COLHEITA.transitions.forEach(t => {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${t.from}</td><td>${t.read || "ε"}</td><td>${t.pop}</td><td>${t.to}</td><td>${t.push || "ε"}</td>`;
  rules.append(tr);
});

// Autoteste no console.
const failed = runSuite(COLHEITA).filter(r => !r.ok);
failed.length ? console.error("Falha nos testes do PDA:", failed) : console.info("PDA validado: todos os casos de teste passaram.");
