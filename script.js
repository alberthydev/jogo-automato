/* ===== Definição do PDA =====
   push é escrito com o topo primeiro: pop S, push "KS" deixa K no topo e S embaixo.
   'λ' = não lê símbolo da entrada. */
const REGRAS = [
  { from: 'q0', read: '*', pop: 'Z', to: 'q1', push: 'SZ' }, // coleta a estrela
  { from: 'q1', read: 'a', pop: 'S', to: 'q2', push: 'KS' }, // primeira chave
  { from: 'q2', read: 'a', pop: 'K', to: 'q2', push: 'KK' }, // mais chaves
  { from: 'q2', read: 's', pop: 'K', to: 'q3', push: 'K'  }, // abre passagem (exige chave)
  { from: 'q3', read: 'b', pop: 'K', to: 'q3', push: ''   }, // usa uma chave
  { from: 'q3', read: 'c', pop: 'S', to: 'q4', push: 'S'  }, // portal (só sem chaves)
  { from: 'q4', read: 'λ', pop: 'S', to: 'q5', push: ''   }, // baú
];
const FINAL = 'q5';
const NOME_ESTADO = { q0: 'início', q1: 'estrela coletada', q2: 'coletando chaves', q3: 'passagem aberta', q4: 'portal', q5: 'baú (final)' };
const NOME_PILHA = { Z: 'fundo', S: 'estrela', K: 'chave' };
const SIMBOLOS = '*asbc';

/* ===== Mapa ===== */
const MAPA = [
  '##########',
  '#@.*.a.a.#',
  '#b######.#',
  '#.######s#',
  '#.######.#',
  '#Bc.b.b..#',
  '##########',
];
const ICONE = { '*': '⭐', a: '🗝️', b: '🔒', s: '🚪', c: '🌀', B: '🏆' };

let st, roteiro, idx, grid, px, py, timer;
const $ = id => document.getElementById(id);

/* ===== Motor ===== */
function log(t) { $('log').insertAdjacentHTML('afterbegin', `<li>${t}</li>`); }

function apply(sym) {
  const topo = st.stack[st.stack.length - 1];
  const i = REGRAS.findIndex(r => r.from === st.q && r.read === sym && r.pop === topo);
  if (i < 0) return false;
  const r = REGRAS[i], antes = st.q;
  st.stack.pop();
  for (const ch of [...r.push].reverse()) st.stack.push(ch);
  st.q = r.to; st.last = i; st.n++;
  log(`${st.n}. ${antes} —${sym}→ ${r.to} · desempilha ${r.pop}, empilha ${r.push || 'λ'}`);
  return true;
}

function consume(sym) {
  st.sym = sym;
  if (!apply(sym)) {
    st.status = 'rej';
    st.msg = `Sem transição para "${sym}" em ${st.q} com ${st.stack[st.stack.length - 1]} no topo da pilha.`;
    log(`✖ ${st.msg}`);
  }
}

function finish() {
  st.sym = 'λ';
  while (apply('λ')) { /* fecha as transições λ */ }
  if (st.q === FINAL) { st.status = 'acc'; st.msg = 'Chegou ao baú com a entrada toda consumida.'; }
  else { st.status = 'rej'; st.msg = `Parou em ${st.q}, que não é estado final.`; }
  log(st.status === 'acc' ? '✔ ACEITA' : `✖ ${st.msg}`);
}

/* ===== Modo roteiro ===== */
function carregar(texto) {
  reset();
  roteiro = [...texto].filter(c => SIMBOLOS.includes(c));
  render();
}

function passo() {
  if (!st || st.status !== 'run') return;
  if (idx === 0 && st.n === 0 && roteiro.length === 0) carregar($('entrada').value);
  if (st.status !== 'run') return;
  if (idx < roteiro.length) consume(roteiro[idx++]); else finish();
  render();
}

function executar() {
  clearInterval(timer);
  if (st.n === 0 && idx === 0) carregar($('entrada').value);
  timer = setInterval(() => { passo(); if (st.status !== 'run') clearInterval(timer); }, 600);
}

/* ===== Modo jogo (WASD) ===== */
function mover(dx, dy) {
  if (st.status !== 'run') return;
  const nx = px + dx, ny = py + dy, c = grid[ny] && grid[ny][nx];
  if (c === undefined || c === '#') return;
  if (SIMBOLOS.includes(c)) {
    roteiro.push(c); idx = roteiro.length;
    consume(c);
    if (st.status === 'rej') { render(); return; }
    grid[ny][nx] = '.';
  } else if (c === 'B') {
    finish();
    if (st.status === 'acc') { px = nx; py = ny; }
    render(); return;
  }
  px = nx; py = ny; render();
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const m = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0], arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0] }[e.key.toLowerCase()];
  if (!m) return;
  e.preventDefault();
  mover(m[0], m[1]);
});

/* ===== Interface ===== */
function reset() {
  clearInterval(timer);
  st = { q: 'q0', stack: ['Z'], status: 'run', msg: '', sym: '–', last: -1, n: 0 };
  roteiro = []; idx = 0;
  grid = MAPA.map(r => [...r].map(c => (c === '@' ? '.' : c)));
  px = 1; py = 1;
  $('log').innerHTML = '';
  render();
}

function render() {
  let h = '';
  grid.forEach((linha, y) => linha.forEach((c, x) => {
    const heroi = x === px && y === py;
    h += `<div class="cel${c === '#' ? ' parede' : ''}${heroi ? ' heroi' : ''}">${heroi ? '🧙' : (ICONE[c] || '')}</div>`;
  }));
  $('mapa').innerHTML = h;

  const sel = $('resultado');
  sel.className = 'selo ' + st.status;
  sel.textContent = { run: 'Em andamento', acc: 'ACEITA', rej: 'REJEITADA' }[st.status];
  $('motivo').textContent = st.msg;
  $('estado').textContent = st.q;
  $('estadoNome').textContent = NOME_ESTADO[st.q];
  $('simbolo').textContent = st.sym;
  $('pilha').innerHTML = [...st.stack].reverse()
    .map(s => `<li class="${s}">${s}<small>${NOME_PILHA[s]}</small></li>`).join('');
  $('roteiro').innerHTML = roteiro
    .map((s, i) => `<span class="${i < idx ? 'lido' : ''}${i === idx ? ' prox' : ''}">${s}</span>`).join('') || '<em>vazio</em>';
  document.querySelectorAll('#regras tr[data-i]').forEach(tr => tr.classList.toggle('ativa', +tr.dataset.i === st.last));
}

function montarRegras() {
  $('regras').innerHTML = '<tr><th>De</th><th>Lê</th><th>Topo</th><th>Para</th><th>Empilha</th></tr>' +
    REGRAS.map((r, i) => `<tr data-i="${i}"><td>${r.from}</td><td>${r.read}</td><td>${r.pop}</td><td>${r.to}</td><td>${r.push || 'λ'}</td></tr>`).join('');
}

$('btPasso').onclick = () => { clearInterval(timer); passo(); };
$('btRodar').onclick = executar;
$('btReset').onclick = reset;
document.querySelectorAll('.exemplos button').forEach(b => b.onclick = () => {
  $('entrada').value = b.dataset.s; carregar(b.dataset.s); executar();
});

montarRegras();
reset();
