// tests.js — casos de teste do PDA (usados na interface, no console e em `npm test`).
// REQUIRED_CASES são os exemplos exibidos na interface (o trabalho pede ao menos 4 situações).
const REQUIRED_CASES = [
  { seq: "abcde",     accept: true,  title: "1 · Reconstrução mínima", why: "1 tábua, 1 chave e o moinho.", reason: "" },
  { seq: "aabbccdde", accept: true,  title: "2 · Reconstrução completa", why: "2 tábuas e 2 chaves, todas usadas.", reason: "" },
  { seq: "aabcde",    accept: false, title: "3 · Ponte incompleta", why: "Sobra uma tábua (B) e já tenta coletar chave.", reason: "ponte ainda não" },
  { seq: "aabbccde",  accept: false, title: "4 · Portão incompleto", why: "Sobra uma chave (K) ao tentar entrar no moinho.", reason: "restam chaves" },
  { seq: "aabbcdde",  accept: false, title: "5 · Chave a mais", why: "Usa duas chaves tendo coletado uma.", reason: "mais d do que c" },
  { seq: "aabbbcde",  accept: false, title: "6 · Tábua a mais", why: "Usa três tábuas tendo coletado duas.", reason: "mais b do que a" }
];

const EXTRA_CASES = [
  { seq: "",        accept: false, title: "Sequência vazia", reason: "vazia" },
  { seq: "abc",     accept: false, title: "Termina com chave na pilha", reason: "chaves (K) ainda na pilha" },
  { seq: "abcd",    accept: false, title: "Falta o moinho", reason: "antes do e" },
  { seq: "abce",    accept: false, title: "Moinho com portão fechado", reason: "restam chaves" },
  { seq: "abe",     accept: false, title: "Moinho sem chave", reason: "ao menos uma chave" },
  { seq: "abd",     accept: false, title: "Usar chave sem coletar", reason: "Não há chave" },
  { seq: "abcdc",   accept: false, title: "Coletar chave após usar", reason: "depois que o uso no portão começou" },
  { seq: "abcdee",  accept: false, title: "Símbolo após o moinho", reason: "moinho já foi alcançado" },
  { seq: "aaabbbcccddde", accept: true, title: "n = 3, m = 3" },
  { seq: "abacde",  accept: false, title: "Coletar tábua após iniciar a ponte", reason: "depois que a reconstrução" },
  { seq: "bcde",    accept: false, title: "Usar madeira sem coletar", reason: "nenhuma foi coletada" },
  { seq: "abcdx",   accept: false, title: "Símbolo desconhecido", reason: "desconhecido" },
  { seq: "abbcde",  accept: false, title: "Tábua a mais (b)", reason: "mais b do que a" },
  { seq: "ce",      accept: false, title: "Chave sem ponte", reason: "n > 0" },
  { seq: "abcbde",  accept: false, title: "Tábua depois de chave", reason: "concluída antes da coleta" }
];

const ALL_CASES = [...REQUIRED_CASES, ...EXTRA_CASES];

/** Executa todos os casos num PDA e devolve [{...caso, got, ok, reason}]. */
function runSuite(pda) {
  return ALL_CASES.map(t => {
    const r = pda.run(t.seq);
    const okReason = !t.reason || r.reason.includes(t.reason);
    return { ...t, got: r.accepted, ok: r.accepted === t.accept && okReason, expectedReason: t.reason, reason: r.reason };
  });
}
