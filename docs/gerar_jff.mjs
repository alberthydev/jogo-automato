// Gera docs/ultima-colheita.jff (JFLAP) a partir da MESMA definição usada pelo jogo (js/pda.js).
// Uso: node docs/gerar_jff.mjs
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { COLHEITA } = vm.runInNewContext(fs.readFileSync(path.join(root, "js/pda.js"), "utf8") + "\n;({ COLHEITA })");
const idx = Object.fromEntries(COLHEITA.states.map((s, i) => [s.id, i]));
const tag = (t, v) => v ? `<${t}>${v}</${t}>` : `<${t}/>`;
const out = ['<?xml version="1.0" encoding="UTF-8" standalone="no"?><!--A Última Colheita-->', "<structure>", "\t<type>pda</type>", "\t<automaton>"];
COLHEITA.states.forEach((s, i) => {
  const extra = s.id === COLHEITA.initial ? "<initial/>" : COLHEITA.finals.includes(s.id) ? "<final/>" : "";
  out.push(`\t\t<state id="${i}" name="${s.id}"><x>${60 + i * 150}.0</x><y>140.0</y>${extra}</state>`);
});
for (const t of COLHEITA.transitions)
  out.push(`\t\t<transition><from>${idx[t.from]}</from><to>${idx[t.to]}</to>${tag("read", t.read)}${tag("pop", t.pop)}${tag("push", t.push)}</transition>`);
out.push("\t</automaton>", "</structure>");
fs.writeFileSync(path.join(root, "docs/ultima-colheita.jff"), out.join("\n") + "\n");
console.log("docs/ultima-colheita.jff gerado:", COLHEITA.states.length, "estados,", COLHEITA.transitions.length, "transições");
