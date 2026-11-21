// Carrega os scripts clássicos do jogo (os mesmos do navegador) num contexto isolado.
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path"; import { fileURLToPath } from "node:url";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../js");
const src = ["pda", "tests"].map(f => fs.readFileSync(path.join(dir, f + ".js"), "utf8")).join("\n");
const { COLHEITA, createSession, runSuite } = vm.runInNewContext(src + "\n;({ COLHEITA, createSession, runSuite })");

let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.error("FALHA:", msg); } };

for (const r of runSuite(COLHEITA))
  check(r.ok, `"${r.seq}" esperado ${r.accept ? "aceita" : "rejeitada"}; obtido ${r.got ? "aceita" : "rejeitada"} — ${r.reason}`);

// Linguagem completa contra a definição formal L = { a^n b^n c^m d^m e | n, m > 0 }
const inL = s => { const m = /^(a+)(b+)(c+)(d+)e$/.exec(s); return !!m && m[1].length === m[2].length && m[3].length === m[4].length; };
let n = 0;
const gen = (len, pre = "") => len === 0 ? [pre] : [..."abcde"].flatMap(ch => gen(len - 1, pre + ch));
for (let len = 0; len <= 7; len++) for (const s of gen(len)) { n++; check(COLHEITA.run(s).accepted === inL(s), `divergência em "${s}"`); }
// Palavras válidas maiores e todas as suas mutações (remover / trocar um símbolo)
for (let a = 1; a <= 4; a++) for (let c = 1; c <= 4; c++) {
  const w = "a".repeat(a) + "b".repeat(a) + "c".repeat(c) + "d".repeat(c) + "e";
  check(COLHEITA.run(w).accepted, `"${w}" deveria ser aceita`); n++;
  for (let i = 0; i < w.length; i++) {
    const muts = [w.slice(0, i) + w.slice(i + 1), ...[..."abcde"].map(x => w.slice(0, i) + x + w.slice(i + 1))];
    for (const m of muts) { n++; check(COLHEITA.run(m).accepted === inL(m), `divergência em "${m}"`); }
  }
}

// Sessão incremental (o que o jogo usa)
const s = createSession();
for (const x of "bcde") check(!s.feed(x).ok, `${x} no início deve ser negado`);
check(s.view().state === "q0" && s.prefix === "", "ações negadas não alteram o PDA");
check(s.feed("a").ok && s.feed("a").ok, "duas coletas de tábua");
check(s.view().boards === 2 && s.view().state === "q1", "2 B na pilha em q1");
check(!s.feed("c").ok, "c não pode ser lido com B na pilha");
check(s.feed("b").ok && s.view().state === "q2", "b move para q2");
check(!s.feed("a").ok && !s.feed("c").ok, "a e c negados durante a reconstrução");
check(s.feed("b").ok && s.view().state === "q3", "ponte concluída em q3");
check(s.feed("c").ok && s.feed("c").ok && s.view().keys === 2 && s.view().state === "q4", "2 chaves (K) em q4");
check(!s.feed("e").ok && !s.feed("b").ok, "e (portão fechado) e b (após chaves) negados");
check(s.feed("d").ok && s.view().state === "q5" && !s.feed("c").ok, "d move para q5 e c é negado");
check(s.feed("d").ok && s.view().state === "q6", "portão aberto em q6");
const fin = s.feed("e");
check(fin.ok && fin.view.accepted && fin.view.state === "q7" && s.prefix === "aabbccdde", "aceita aabbccdde");
check(!s.feed("a").ok, "nada após o estado final");
console.log(`${n} sequências verificadas contra a definição de L; ${fails ? fails + " falha(s)" : "todos os testes passaram"}.`);
process.exit(fails ? 1 : 0);
