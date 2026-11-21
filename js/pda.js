// pda.js — Autômato de Pilha (PDA) formal e independente da renderização.
//
//   M = (Q, Σ, Γ, δ, q0, Z, F)
//   Q = {q0..q7}   Σ = {a, b, c, d, e}   Γ = {Z, B, K}   q0 = inicial   Z = fundo da pilha   F = {q7}
//   L = { a^n b^n c^m d^m e | n > 0, m > 0 }      (aceitação por estado final)
//
// Uma transição é (origem, leitura, topo) -> (destino, substituição do topo).
// "leitura" vazia = ε (não consome entrada). A substituição é escrita com o topo
// à esquerda, como no JFLAP: "BZ" empilha B sobre Z; "" desempilha.
//
// O motor é NÃO DETERMINÍSTICO: mantém o conjunto de configurações possíveis e
// calcula o fecho-ε antes de cada leitura. Uma entrada é aceita se existir ao
// menos um caminho que consome toda a entrada e termina em estado final.

const EPS = "ε";

class PDA {
  constructor(def) { Object.assign(this, def); }

  // Configuração: estado + pilha (índice 0 = fundo, último = topo) + caminho percorrido.
  initialConfig() { return { state: this.initial, stack: [this.bottom], path: [] }; }
  top(c) { return c.stack[c.stack.length - 1]; }
  isFinal(c) { return this.finals.includes(c.state); }
  key(c) { return c.state + "|" + c.stack.join(""); }

  /** Transições aplicáveis na configuração c lendo `symbol` ("" = ε). */
  moves(c, symbol) {
    return this.transitions.filter(t => t.from === c.state && t.read === symbol && t.pop === this.top(c));
  }

  /** Há alguma transição que consome símbolo a partir de c? */
  canConsume(c) {
    return this.transitions.some(t => t.read !== "" && t.from === c.state && t.pop === this.top(c));
  }

  /** Aplica a transição t: desempilha o topo e empilha `push` (primeiro caractere fica no topo). */
  apply(c, t) {
    const stack = c.stack.slice(0, -1);
    for (let i = t.push.length - 1; i >= 0; i--) stack.push(t.push[i]);
    const step = {
      from: t.from, to: t.to, read: t.read || EPS, pop: t.pop, push: t.push || EPS,
      rule: ruleText(t), note: t.note, stack: [...stack].reverse() // topo primeiro (para exibição)
    };
    return { state: t.to, stack, path: [...c.path, step] };
  }

  /** Fecho-ε: todas as configurações alcançáveis sem consumir entrada. */
  closure(configs) {
    const seen = new Map();
    const queue = [...configs];
    while (queue.length && seen.size < 500) {
      const c = queue.shift();
      const k = this.key(c);
      if (seen.has(k)) continue;
      seen.set(k, c);
      if (c.stack.length > 64) continue; // proteção contra pilhas ilimitadas
      for (const t of this.moves(c, "")) queue.push(this.apply(c, t));
    }
    return [...seen.values()];
  }

  /** Lê um símbolo a partir do conjunto de configurações (com fecho-ε). */
  step(configs, symbol) {
    const out = new Map();
    for (const c of this.closure(configs))
      for (const t of this.moves(c, symbol)) { const n = this.apply(c, t); if (!out.has(this.key(n))) out.set(this.key(n), n); }
    return [...out.values()];
  }

  /** Processa uma sequência completa. Sempre reinicia o autômato. */
  run(sequence) {
    let core = [this.initialConfig()];
    let prefix = "";
    const result = (accepted, reason, c, extra = {}) => ({
      accepted, reason, history: c ? c.path : [], finalState: c ? c.state : this.initial,
      stack: c ? [...c.stack].reverse() : [this.bottom], consumed: prefix.length, ...extra
    });
    for (const ch of sequence) {
      if (!this.inputAlphabet.includes(ch))
        return result(false, `Símbolo desconhecido “${ch}” na posição ${prefix.length + 1}. O alfabeto é {${this.inputAlphabet.join(", ")}}.`, core[0], { rejectedAt: prefix.length, unknown: true });
      const next = this.step(core, ch);
      if (!next.length) {
        const cl = this.closure(core);
        return result(false, this.explain(cl, ch, prefix), cl[cl.length - 1], { rejectedAt: prefix.length });
      }
      core = next; prefix += ch;
    }
    const cl = this.closure(core);
    const acc = cl.find(c => this.isFinal(c));
    if (acc) return result(true, this.acceptMessage, acc);
    return result(false, this.explainEnd(cl, prefix), cl[cl.length - 1], { rejectedAt: prefix.length, endOfInput: true });
  }
}

function ruleText(t) { return `${t.read || EPS},${t.pop}/${t.push || EPS}`; }

/**
 * Sessão incremental: o jogo alimenta o PDA um símbolo por vez.
 * Uma ação rejeitada NÃO altera o autômato (a ação é apenas negada com o motivo),
 * para que o jogador nunca fique preso numa partida sem saída.
 */
class PDASession {
  constructor(pda) { this.pda = pda; this.reset(); }

  reset() {
    this.core = [this.pda.initialConfig()];
    this.prefix = "";
    this.lastSymbol = "—";
    this.lastReason = "Estado inicial q0. Z marca o fundo da pilha.";
    this.lastRejected = false;
    this.rejections = 0;
  }

  /** O símbolo seria aceito agora? (consulta sem alterar nada) */
  canRead(symbol) { return this.pda.step(this.core, symbol).length > 0; }

  feed(symbol) {
    const reject = reason => {
      this.lastRejected = true; this.rejections++; this.lastReason = reason; this.lastSymbol = symbol;
      return { ok: false, reason, steps: [], view: this.view() };
    };
    if (!this.pda.inputAlphabet.includes(symbol)) return reject(`Símbolo desconhecido “${symbol}”.`);
    const next = this.pda.step(this.core, symbol);
    if (!next.length) return reject(this.pda.explain(this.pda.closure(this.core), symbol, this.prefix));
    const steps = next[0].path.slice(this.core[0].path.length); // ε usadas + a leitura
    this.core = next; this.prefix += symbol; this.lastSymbol = symbol; this.lastRejected = false;
    this.lastReason = steps.map(s => s.note).join(" ");
    return { ok: true, reason: this.lastReason, steps, view: this.view() };
  }

  /** Configuração exibida: a atual, avançando por ε apenas quando ela está “parada”. */
  display() {
    let d = this.core[0];
    if (this.prefix && !this.pda.isFinal(d) && !this.pda.canConsume(d)) {
      const live = this.pda.closure(this.core).find(c => this.pda.isFinal(c) || this.pda.canConsume(c));
      if (live) d = live;
    }
    return d;
  }

  view() {
    const d = this.display();
    return {
      state: d.state, stack: [...d.stack], stackTopFirst: [...d.stack].reverse(), prefix: this.prefix,
      lastSymbol: this.lastSymbol, reason: this.lastReason, rejected: this.lastRejected,
      accepted: this.prefix.length > 0 && this.pda.isFinal(d), rejections: this.rejections,
      held: d.stack.length - 1, boards: d.stack.filter(x => x === "B").length, keys: d.stack.filter(x => x === "K").length
    };
  }
}

// ---------------------------------------------------------------------------
// Definição concreta: L = { aⁿ bⁿ cᵐ dᵐ e | n > 0, m > 0 }
//   a: coletar tábua (empilha B)   b: usar tábua na ponte (desempilha B)
//   c: coletar chave (empilha K)   d: usar chave no portão (desempilha K)   e: entrar no moinho
// ---------------------------------------------------------------------------
const T = (from, read, pop, to, push, note) => ({ from, read, pop, to, push, note });

const COLHEITA = new PDA({
  states: [
    { id: "q0", name: "Início" }, { id: "q1", name: "Coletando madeira" },
    { id: "q2", name: "Reconstruindo a ponte" }, { id: "q3", name: "Ponte concluída" },
    { id: "q4", name: "Coletando chaves" }, { id: "q5", name: "Abrindo o portão" },
    { id: "q6", name: "Portão aberto" }, { id: "q7", name: "Fazenda restaurada" }
  ],
  inputAlphabet: ["a", "b", "c", "d", "e"],
  stackAlphabet: ["Z", "B", "K"],
  initial: "q0", bottom: "Z", finals: ["q7"],
  transitions: [
    T("q0", "",  "Z", "q1", "Z",  "ε: inicia a fase de coleta."),
    T("q1", "a", "Z", "q1", "BZ", "a: coletou uma tábua e empilhou B."),
    T("q1", "a", "B", "q1", "BB", "a: coletou uma tábua e empilhou B."),
    T("q1", "",  "B", "q2", "B",  "ε: encerra a coleta e inicia a reconstrução (há ao menos um B)."),
    T("q2", "b", "B", "q2", "",   "b: usou uma tábua na ponte e desempilhou B."),
    T("q2", "",  "Z", "q3", "Z",  "ε: todas as tábuas foram usadas; a ponte está concluída."),
    T("q3", "c", "Z", "q4", "KZ", "c: coletou uma chave e empilhou K."),
    T("q4", "c", "K", "q4", "KK", "c: coletou uma chave e empilhou K."),
    T("q4", "",  "K", "q5", "K",  "ε: encerra a coleta de chaves e começa a abrir o portão (há ao menos um K)."),
    T("q5", "d", "K", "q5", "",   "d: usou uma chave no portão e desempilhou K."),
    T("q5", "",  "Z", "q6", "Z",  "ε: todas as chaves foram usadas; o portão está aberto."),
    T("q6", "e", "Z", "q7", "Z",  "e: entrou no moinho e alcançou o estado final q7.")
  ],
  acceptMessage: "Entrada consumida por completo: o PDA alcançou q7 (estado final) com apenas Z na pilha.",

  explain(configs, symbol, prefix) {
    const hasB = configs.some(c => c.stack.includes("B")), hasK = configs.some(c => c.stack.includes("K"));
    const bridge = prefix.includes("b"), keyed = prefix.includes("c"), used = prefix.includes("d");
    if (configs.some(c => c.state === "q7")) return "O moinho já foi alcançado (q7): depois de e não existe mais nenhuma transição.";
    switch (symbol) {
      case "a": return "Não é possível coletar tábuas (a) depois que a reconstrução da ponte começou: a partir de q2 o PDA não lê mais a.";
      case "b": return keyed ? "A ponte já foi concluída antes da coleta das chaves: não é mais possível usar tábuas (b)."
        : prefix.includes("a") ? "Há mais b do que a: todas as tábuas coletadas já foram usadas, o topo da pilha é Z e não existe B para desempilhar."
        : "Não há tábua para usar na ponte: nenhuma foi coletada e a pilha contém apenas Z.";
      case "c": return used ? "Não é possível coletar chaves (c) depois que o uso no portão começou: a partir de q5 o PDA só lê d."
        : hasB ? "A ponte ainda não foi concluída: restam tábuas (B) na pilha, então não dá para coletar chaves (c)."
        : "É preciso coletar e usar ao menos uma tábua (n > 0) para concluir a ponte antes de coletar chaves.";
      case "d": return !keyed ? (hasB ? "A ponte ainda não foi concluída e nenhuma chave foi coletada: não há K para desempilhar no portão."
          : "Não há chave para usar no portão: nenhuma foi coletada e a pilha não tem K.")
        : "Há mais d do que c: todas as chaves coletadas já foram usadas, o topo da pilha é Z e não existe K para desempilhar.";
      case "e": return hasK ? "O portão ainda não está aberto: restam chaves (K) na pilha, então o PDA não pode ir para q6 nem ler e."
        : hasB ? "A ponte ainda não foi concluída: restam tábuas (B) na pilha, então o PDA não pode ler e."
        : bridge ? "É preciso coletar e usar ao menos uma chave (m > 0) para abrir o portão antes de entrar no moinho."
        : "É preciso concluir a ponte (n > 0) e abrir o portão (m > 0) antes de entrar no moinho.";
      default: return `Não existe transição para ${symbol} neste estado.`;
    }
  },
  explainEnd(configs, prefix) {
    if (!prefix) return "A sequência vazia não pertence à linguagem: é preciso n > 0 tábuas, m > 0 chaves e o e final.";
    if (configs.some(c => c.stack.includes("B"))) return "A entrada terminou com tábuas (B) ainda na pilha: faltam b para usá-las, as chaves e o e final.";
    if (configs.some(c => c.stack.includes("K"))) return "A entrada terminou com chaves (K) ainda na pilha: faltam d para usá-las e o e final.";
    if (configs.some(c => c.state === "q6")) return "A entrada terminou antes do e: o portão está aberto (q6), mas o PDA ainda precisa entrar no moinho.";
    return "A entrada terminou antes de coletar e usar chaves: o PDA está em q3 (ponte concluída) e ainda precisa abrir o portão e entrar no moinho.";
  }
});

const createSession = () => new PDASession(COLHEITA);
