// game.js — regras, fases, eventos e encerramento.
// Regra fundamental: toda ação relevante gera um símbolo e passa pelo PDA (session.feed).
// O mundo só reflete o resultado: a ponte está aberta se o PDA está em q3..q7 e o portão
// se está em q6..q7. Nada é liberado por checagem paralela.
const FINISH_MS = 3200;
const BRIDGE_STATES = ["q3", "q4", "q5", "q6", "q7"];
const GATE_STATES = ["q6", "q7"];
const CORRIDOR_Y = 285;                     // corredor livre de obstáculos usado pelo roteiro automático

class Game {
  /** hooks: { pda(view, attempts), message(text,tone), hud({area,objective,nearby}), letter(open), ending(seq), menu() } */
  constructor(canvas, hooks, inventoryEl) {
    this.canvas = canvas; this.c = canvas.getContext("2d"); this.hooks = hooks;
    this.map = new FarmMap(); this.player = new Player(); this.inventory = new Inventory(inventoryEl);
    this.session = createSession();
    this.controls = new Controls({ onInteract: () => this.interact(), onRestart: () => this.reset(true) });
    this.mode = "play";                        // play (WASD) | sequence (roteiro para o autômato)
    this.phase = "menu";                       // menu | idle | playing | letter | script | finishing | ended
    this.last = 0; this.cooldown = 0;
    this.resetWorld();
    requestAnimationFrame(t => this.loop(t));
  }

  resetWorld() {
    this.script = null;
    this.cooldown = 0;
    this.session.reset(); this.player.reset();
    this.planks = PLANK_SPOTS.map(p => ({ ...p, collected: false }));
    this.keys = KEY_SPOTS.map(p => ({ ...p, collected: false }));
    this.boards = 0; this.usedKeys = 0;        // tábuas na ponte / chaves no portão (espelham os b / d aceitos)
    this.attempts = [];                        // TODAS as ações que geraram símbolo: {ch, ok}
    this.insideMill = false;
    this.letterRead = false; this.finishT = 0; this.finishStart = 0;
    this.refreshWorld();
    this.sync("A carta do seu avô está perto da casa. Aproxime-se e pressione E.");
  }

  /** Lê do PDA o que está liberado no mundo. */
  refreshWorld() {
    const st = this.session.view().state;
    this.bridgeOpen = BRIDGE_STATES.includes(st);
    this.gateOpen = GATE_STATES.includes(st);
  }
  mapState() { return { bridgeOpen: this.bridgeOpen, gateOpen: this.gateOpen, boards: this.boards, insideMill: this.insideMill }; }

  setMode(mode) { this.mode = mode; }
  activePhase() { return this.mode === "play" ? "playing" : "idle"; }
  enterIdle() {                                // modo sequência: mundo parado, esperando um roteiro
    this.cancelScript(); this.resetWorld(); this.hooks.letter(false); this.hooks.ending(null);
    this.phase = "idle"; this.sync("Modo sequência: digite uma sequência de a, b, c, d e e no laboratório e clique em Processar.");
  }
  reset(autostart = false) {
    this.cancelScript(); this.resetWorld(); this.hooks.letter(false); this.hooks.ending(null);
    this.phase = autostart ? this.activePhase() : "menu";
    if (autostart) this.sync(this.mode === "play" ? "Pressione E para ler a carta na caixa de correio." : "Mundo reiniciado. Digite uma nova sequência.");
  }
  backToMenu() { this.reset(false); this.hooks.menu(); }

  // --------------------------------------------------------------- interação
  nearest() {
    const p = this.player, dist = (s) => Math.hypot(p.cx - s.x, p.cy - s.y), cands = [];
    const add = (type, at, range, label, item) => { const d = dist(at); if (d < range) cands.push({ type, at, item, dist: d, label }); };
    if (this.insideMill) {
      for (const [type, spot] of [["lever", MILL_LEVER], ["exit", MILL_EXIT]]) add(type, spot, spot.range, spot.label);
      return cands[0] || null;
    }
    add("letter", SPOTS.letter, SPOTS.letter.range, SPOTS.letter.label);
    this.planks.forEach(pl => { if (!pl.collected) add("plank", pl, 44, "Tábua de madeira", pl); });
    this.keys.forEach(k => { if (!k.collected) add("key", k, 44, "Chave", k); });
    add("bridge", SPOTS.bridge, SPOTS.bridge.range, SPOTS.bridge.label);
    add("note", ORCHARD_NOTE, ORCHARD_NOTE.range, ORCHARD_NOTE.label);
    add("gate", SPOTS.gate, SPOTS.gate.range, SPOTS.gate.label);
    if (this.gateOpen) add("mill", SPOTS.mill, 28, SPOTS.mill.label);
    return cands.sort((a, b) => a.dist - b.dist)[0] || null;
  }

  interact() {
    if (this.phase === "letter") { this.phase = "playing"; this.hooks.letter(false); return; }
    if (this.phase !== "playing") return;
    const now = performance.now();
    if (now < this.cooldown) return;           // evita repetição acidental
    this.cooldown = now + 220;
    const t = this.nearest();
    if (!t) return this.hooks.message("Não há nada para interagir por perto.", "info");
    if (t.type === "letter") {
      this.letterRead = true; this.phase = "letter"; this.hooks.letter(true);
      return this.sync("Ato 1 · A carta explica a missão: tábuas, ponte, chaves, portão e moinho.");
    }
    if (!this.letterRead) return this.hooks.message("Primeiro leia a carta do seu avô, perto da casa.", "info");
    if (t.type === "plank") this.collectPlank(t.item);
    else if (t.type === "key") this.collectKey(t.item);
    else if (t.type === "bridge") this.useBridge(false);
    else if (t.type === "gate") this.useGate(false);
    else if (t.type === "note") this.hooks.message("Recado do avô: deixei uma chave junto à entrada. Siga as trilhas entre as macieiras se quiser procurar as outras.", "info");
    else if (t.type === "mill") this.enterMill();
    else if (t.type === "exit") this.leaveMill();
    else if (t.type === "lever") this.pullLever();
  }

  /** Gera o símbolo, entrega ao PDA, registra a tentativa e só então altera o mundo. */
  perform(ch, okMessage, onOk) {
    const r = this.session.feed(ch);
    this.attempts.push({ ch, ok: r.ok });
    if (!r.ok) { Sound.play("reject"); this.sync(r.reason, "bad"); return r; }
    onOk && onOk(r); this.refreshWorld();
    this.sync(typeof okMessage === "function" ? okMessage() : okMessage, "ok");
    return r;
  }

  collectPlank(item) {                         // a → empilha B
    return this.perform("a", "Tábua guardada. Leve a madeira até a ponte.", () => { item.collected = true; Sound.play("collect"); });
  }
  useBridge(force) {                           // b → desempilha B (force: o roteiro envia b mesmo com a ponte pronta)
    if (this.bridgeOpen && !force) { this.hooks.message("A ponte já está pronta. Atravesse e procure as chaves!", "info"); return null; }
    return this.perform("b", () => this.bridgeOpen
      ? "Ponte pronta! Procure o recado do avô na entrada do pomar."
      : "Tábua encaixada. Ainda há madeira na mochila.", () => { this.boards++; Sound.play("place"); });
  }
  collectKey(item) {                           // c → empilha K (só faz sentido após a ponte)
    return this.perform("c", "Chave guardada. O portão fica perto do moinho.", () => { item.collected = true; Sound.play("collect"); });
  }
  useGate(force) {                             // d → desempilha K
    if (this.gateOpen && !force) { this.hooks.message("O portão já está aberto. Entre no moinho!", "info"); return null; }
    return this.perform("d", () => this.gateOpen
      ? "O portão abriu. Entre no moinho!"
      : "Uma fechadura abriu. Use as chaves restantes.", () => { this.usedKeys++; Sound.play("place"); });
  }
  enterMill() {
    if (!this.gateOpen) return;
    this.insideMill = true;
    this.player.x = MILL_EXIT.x - this.player.w / 2;
    this.player.y = MILL_EXIT.y - 36;
    this.player.face = "up";
    this.sync("As engrenagens estão paradas. Procure a alavanca no fundo do moinho.");
  }

  leaveMill() {
    this.insideMill = false;
    this.player.x = MILL_ENTRY.x - this.player.w / 2;
    this.player.y = MILL_ENTRY.y - this.player.h / 2;
    this.player.face = "down";
    this.sync("Você voltou ao pátio.");
  }

  pullLever() {                                // e → só aceito com o portão aberto (q6)
    const lastSymbol = !this.script || this.script.i === this.script.queue.length - 1;
    return this.perform("e", lastSymbol ? "As engrenagens despertaram. O moinho volta a girar…" : "O roteiro ainda tem ações.", r => {
      if (r.view.accepted && lastSymbol) this.finish();
    });
  }

  finish() {
    this.phase = "finishing"; this.finishStart = performance.now(); Sound.play("win");
    this.hooks.hud({ area: "O Moinho", objective: "Ato 3 · A última colheita — missão concluída!", nearby: "Fazenda restaurada" });
  }

  // ----------------------------------------------------- roteiro automático (laboratório)
  // O personagem executa a sequência na tela: anda até o local de cada símbolo e realiza a
  // ação; o PDA decide se ela vale. Rejeitada = o roteiro para e o motivo aparece no jogo.
  runScript(seq, cb) {
    this.cancelScript();
    this.resetWorld(); this.letterRead = true;               // roteiro dispensa a carta
    this.hooks.letter(false); this.hooks.ending(null);
    this.phase = "script";
    this.script = { queue: [...seq], i: 0, cb, mode: "next", wait: 0, keys: new Set(), stuck: 0 };
    this.script.ctl = { has: k => this.script.keys.has(k) };
    this.sync(seq ? `Roteiro “${seq}” iniciado: o personagem vai executar cada símbolo.` : "Roteiro vazio: nada a executar.", "info");
  }
  cancelScript() {
    if (!this.script) return;
    const cb = this.script.cb; this.script = null;
    if (this.phase === "script") this.phase = this.activePhase();
    cb.done({ cancelled: true });
  }
  endScript(info) {
    const cb = this.script.cb; this.script = null;
    if (this.phase === "script") this.phase = this.activePhase();
    cb.done(info);
  }

  routeTo(tx, ty) {
    const p = this.player, pts = [];
    if (Math.abs(p.y - CORRIDOR_Y) > 6) pts.push({ x: p.x, y: CORRIDOR_Y });
    pts.push({ x: tx, y: CORRIDOR_Y });
    if (Math.abs(ty - CORRIDOR_Y) > 4) pts.push({ x: tx, y: ty });
    return pts;
  }

  /** Para onde o personagem vai para executar o símbolo `ch` (ou tenta e é negado pelo PDA). */
  scriptTarget(ch) {
    const bridgeW = { x: 665, y: CORRIDOR_Y }, gateP = { x: 857, y: CORRIDOR_Y };
    const item = (list, name) => { const it = list.find(i => !i.collected); return it ? { x: it.x - 11, y: it.y - 35, item: it }
      : { limit: true, reason: `O mapa só tem 3 ${name}: não há mais para coletar na tela.` }; };
    if (ch === "a") return item(this.planks, "tábuas");
    if (ch === "b") return bridgeW;
    if (ch === "c") return this.bridgeOpen ? item(this.keys, "chaves") : bridgeW;
    if (ch === "d") return this.bridgeOpen ? gateP : bridgeW;
    return this.gateOpen ? { x: MILL_ENTRY.x - 11, y: MILL_ENTRY.y - 13 } : this.bridgeOpen ? gateP : bridgeW;
  }

  updateScript(dt) {
    const S = this.script; if (!S) return;
    if (S.mode === "wait") { S.wait -= dt; if (S.wait <= 0) S.mode = S.after || "next"; return; }
    if (S.mode === "next") {
      if (S.i >= S.queue.length) return this.endScript({ completed: true });
      const ch = S.queue[S.i];
      if (!COLHEITA.inputAlphabet.includes(ch)) {
        const reason = `Símbolo desconhecido “${ch}” na posição ${S.i + 1}. O alfabeto é {a, b, c, d, e}.`;
        this.sync(reason, "bad");
        S.cb.symbol(S.i, ch, { ok: false, reason, steps: [], view: this.session.view() });
        return this.endScript({ rejectedAt: S.i, reason, unknown: true });
      }
      if (this.session.view().accepted) {
        const r = this.perform(ch, "");
        S.cb.symbol(S.i, ch, r);
        return this.endScript({ rejectedAt: S.i, reason: r.reason });
      }
      const target = this.scriptTarget(ch);
      if (target.limit) { this.sync(target.reason, "bad"); return this.endScript({ limit: true, reason: target.reason }); }
      S.target = target; S.route = this.routeTo(target.x, target.y); S.mode = "walk"; S.stuck = 0;
      return;
    }
    if (S.mode === "walk") {
      const wp = S.route[0], p = this.player; S.keys.clear();
      const dx = wp.x - p.x, dy = wp.y - p.y, near = Math.abs(dx) < 4 && Math.abs(dy) < 4;
      if (near || S.stuck > 100) {
        if (S.stuck > 100) { p.x = wp.x; p.y = wp.y; }
        S.route.shift(); S.stuck = 0;
        if (!S.route.length) { S.mode = "wait"; S.wait = 350; S.after = "act"; }
        return;
      }
      if (dx > 3) S.keys.add("d"); else if (dx < -3) S.keys.add("a");
      if (dy > 3) S.keys.add("s"); else if (dy < -3) S.keys.add("w");
      if (Math.abs(dx) > 3 && Math.abs(dy) > 3) { if (Math.abs(dx) > Math.abs(dy)) S.keys.delete(dy > 0 ? "s" : "w"); else S.keys.delete(dx > 0 ? "d" : "a"); }
      const bx = p.x, by = p.y;
      p.update(dt * Settings.get("scriptSpeed"), S.ctl, r => this.map.isBlocked(r, this.mapState()));
      S.stuck = (p.x === bx && p.y === by) ? S.stuck + 1 : 0;
      return;
    }
    if (S.mode === "act") {
      const ch = S.queue[S.i], it = S.target.item;
      if (ch === "e" && this.gateOpen && !this.insideMill) {
        this.enterMill();
        S.route = [{ x: this.player.x, y: MILL_LEVER.y + 24 }];
        S.mode = "walk";
        return;
      }
      const r = ch === "a" ? this.collectPlank(it) : ch === "b" ? this.useBridge(true)
        : ch === "c" ? (it ? this.collectKey(it) : this.perform("c", "")) : ch === "d" ? this.useGate(true) : this.pullLever();
      S.cb.symbol(S.i, ch, r);
      if (!r.ok) return this.endScript({ rejectedAt: S.i, reason: r.reason });
      S.i++;
      if (this.phase === "finishing") return this.endScript({ completed: true });
      S.mode = "wait"; S.wait = 500; S.after = "next";
    }
  }

  // --------------------------------------------------------------- ciclo
  update(dt, t) {
    if (this.phase === "playing") this.player.update(dt, this.controls, r => this.map.isBlocked(r, this.mapState()));
    if (this.phase === "script") this.updateScript(dt);
    if (this.phase === "finishing") {
      this.finishT = Math.min(1, (t - this.finishStart) / FINISH_MS);
      if (this.finishT >= 1) { this.phase = "ended"; this.hooks.ending(this.session.prefix); }
    }
    if (this.phase === "ended") this.finishT = 1;
  }

  landscapeState() {
    return { ...this.mapState(), planks: this.planks, keys: this.keys, letterRead: this.letterRead,
      finishT: this.finishT, finished: this.phase === "finishing" || this.phase === "ended" };
  }

  render(t) {
    const world = this.landscapeState();
    const c = this.c;
    if (this.insideMill) this.map.drawMillRoom(c, world.finished, t);
    else this.map.draw(c, world, t);
    const n = this.nearest();
    if (n && this.phase === "playing") {      // destaque + dica da tecla E
      c.strokeStyle = "#fff5b4"; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.arc(n.at.x, n.at.y, 26, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = "#fffdf0"; c.fillRect(n.at.x - 9, n.at.y - 50, 18, 18); c.fillStyle = "#34483a"; c.font = "bold 12px monospace"; c.fillText("E", n.at.x - 4, n.at.y - 37);
    }
    this.player.draw(c);
    if (!this.insideMill) this.map.drawWeather(c, world, t);
  }

  loop(t) {
    const dt = Math.min(40, t - (this.last || t)); this.last = t;
    this.update(dt, t); this.render(t);
    if (this.phase === "playing" || this.phase === "script") this.pushHud();
    requestAnimationFrame(x => this.loop(x));
  }

  // --------------------------------------------------------------- saída para a UI
  pushHud() {
    const v = this.session.view(), n = this.nearest();
    let act = 1, obj = "Encontre a carta do seu avô";
    if (this.letterRead) {
      if (!this.bridgeOpen) { act = 2; obj = this.boards > 0 ? "Termine de reconstruir a ponte" : v.boards > 0 ? "Leve as tábuas até a ponte" : "Colete tábuas no bosque"; }
      else if (!this.gateOpen) { act = 3; obj = this.usedKeys > 0 ? "Termine de abrir o portão" : v.keys > 0 ? "Leve as chaves até o portão do moinho" : "Procure chaves no pomar"; }
      else { act = 3; obj = this.insideMill ? "Acione a alavanca" : "Entre no moinho"; }
    }
    this.hooks.hud({ area: this.insideMill ? "Interior do moinho" : areaAt(this.player.cx, this.player.cy), objective: `Ato ${act} · ${obj}`, nearby: n ? `E · ${n.label}` : "Explore a propriedade" });
  }

  sync(message, tone = "info") {
    const v = this.session.view();
    this.hooks.pda(v, this.attempts);
    this.inventory.render(v, this.boards, this.usedKeys);
    if (message) this.hooks.message(message, tone);
    this.pushHud();
  }
}
