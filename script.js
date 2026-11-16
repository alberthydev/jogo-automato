const REGRAS = [
  { from: 'q0', read: '*', pop: 'Z', to: 'q1', push: 'SZ' },
  { from: 'q1', read: 'a', pop: 'S', to: 'q2', push: 'KS' },
  { from: 'q2', read: 'a', pop: 'K', to: 'q2', push: 'KK' },
  { from: 'q2', read: 's', pop: 'K', to: 'q3', push: 'K'  },
  { from: 'q3', read: 'b', pop: 'K', to: 'q3', push: ''   },
  { from: 'q3', read: 'c', pop: 'S', to: 'q4', push: 'S'  },
  { from: 'q4', read: 'λ', pop: 'S', to: 'q5', push: ''   },
];
const FINAL = 'q5';
const NOME_ESTADO = { q0: 'início', q1: 'estrela coletada', q2: 'coletando chaves', q3: 'passagem aberta', q4: 'portal', q5: 'baú (final)' };
const NOME_PILHA = { Z: 'fundo', S: 'estrela', K: 'chave' };
const SIMBOLOS = '*asbc';

const MAPAS = {
  1: [
    '##########',
    '#@.*.a.a.#',
    '#b######.#',
    '#.######s#',
    '#.######.#',
    '#Bc.b.b..#',
    '##########',
  ],
  2: [
    '##########',
    '#@*a.a.a.#',
    '#c######.#',
    '#.######s#',
    '#.######.#',
    '#Bcb.b.b.#',
    '##########',
  ],
};
let MAPA = MAPAS[1];
const ICONE = { '*': '⭐', a: '🗝️', b: '🔒', s: '🚪', c: '🌀', B: '🏆' };

let st, roteiro, idx, grid, px, py, timer;
const $ = id => document.getElementById(id);

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
  while (apply('λ')) {}
  if (st.q === FINAL) { st.status = 'acc'; st.msg = 'Chegou ao baú com a entrada toda consumida.'; }
  else { st.status = 'rej'; st.msg = `Parou em ${st.q}, que não é estado final.`; }
  log(st.status === 'acc' ? '✔ ACEITA' : `✖ ${st.msg}`);
}

function carregar(texto) {
  reset();
  roteiro = [...texto].filter(c => SIMBOLOS.includes(c));
  render();
}

async function passo() {
  if (!st || st.status !== 'run' || ocupado) return;
  if (idx === 0 && st.n === 0 && roteiro.length === 0) carregar($('entrada').value);
  if (st.status !== 'run') return;
  const g = ger, fim = idx >= roteiro.length;
  ocupado = true;
  const alvo = await caminhar(fim ? 'B' : roteiro[idx]);
  if (g !== ger) return;
  if (fim) { finish(); if (alvo && st.status === 'acc') { px = alvo.x; py = alvo.y; } }
  else { consume(roteiro[idx++]); if (alvo && st.status === 'run') { grid[alvo.y][alvo.x] = '.'; px = alvo.x; py = alvo.y; } }
  ocupado = false;
  render();
}

function executar() {
  clearInterval(timer);
  if (st.n === 0 && idx === 0) carregar($('entrada').value);
  timer = setInterval(() => { passo(); if (st.status !== 'run') clearInterval(timer); }, 600);
}

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
  const itens = (st.stack.includes('S') ? '⭐' : '') + '🗝️'.repeat(st.stack.filter(s => s === 'K').length);
  $('mochila').textContent = itens || 'vazia';
  $('passos').textContent = st.n;
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

let ger = 0, ocupado = false, som = false, ac;

const HISTORIA = {
  '*': 'A estrela mágica brilha na mochila e acende as runas do castelo. (empilhou S)',
  a: 'Uma chave! Ela vai para o topo da pilha. (empilhou K)',
  s: 'A passagem range e cede: só abriu porque há uma chave no topo.',
  b: 'Uma chave gasta, uma tranca a menos. (desempilhou K)',
  c: 'O portal aceita você: não sobrou nenhuma chave na pilha.',
  'λ': 'O baú se abre! Aventura concluída.',
};
const INICIO = 'Pegue a estrela, junte chaves, abra a passagem e gaste cada chave antes do portal.';
const NOTAS = { '*': 660, a: 523, s: 392, b: 440, c: 784, erro: 140 };

function narra(t) { $('narrador').textContent = t; }

function tocar(k) {
  if (!som) return;
  const seq = k === 'vitoria' ? [523, 659, 784, 1047] : [NOTAS[k] || 400];
  seq.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = k === 'erro' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.value = 0.08;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime + i * 0.12; o.start(t); o.stop(t + 0.11);
  });
}

function evento(s) {
  const m = $('mapa'), rej = st.status === 'rej', acc = st.status === 'acc';
  narra(rej ? 'Bloqueado: ' + st.msg : HISTORIA[s] || '');
  tocar(rej ? 'erro' : acc ? 'vitoria' : s);
  m.classList.toggle('vitoria', acc);
  if (rej) { m.classList.remove('balanca'); void m.offsetWidth; m.classList.add('balanca'); }
}

function achar(ch) {
  const key = (x, y) => x + ',' + y, prev = { [key(px, py)]: null }, fila = [[px, py]];
  while (fila.length) {
    const [x, y] = fila.shift();
    if (grid[y][x] === ch && (x !== px || y !== py)) {
      const rota = []; let k = key(x, y);
      while (k) { const [a, b] = k.split(',').map(Number); rota.unshift({ x: a, y: b }); k = prev[k]; }
      return rota.slice(1);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (grid[ny] && grid[ny][nx] !== undefined && grid[ny][nx] !== '#' && !(k in prev)) { prev[k] = key(x, y); fila.push([nx, ny]); }
    }
  }
  return null;
}

async function caminhar(ch) {
  const g = ger, rota = achar(ch);
  if (!rota || !rota.length) return null;
  for (const p of rota.slice(0, -1)) {
    if (g !== ger) return null;
    px = p.x; py = p.y; render();
    await new Promise(r => setTimeout(r, 120));
  }
  return rota[rota.length - 1];
}

const _consume = consume, _finish = finish, _reset = reset, _mover = mover;
consume = function (s) { _consume(s); evento(s); };
finish = function () { _finish(); evento('λ'); };
mover = function (dx, dy) { if (!ocupado) _mover(dx, dy); };
reset = function () { ger++; ocupado = false; _reset(); $('mapa').className = ''; narra(INICIO); };

$('fase').onchange = e => { MAPA = MAPAS[e.target.value]; reset(); };
$('btSom').onclick = e => {
  som = !som; ac = ac || new AudioContext();
  e.currentTarget.setAttribute('aria-pressed', som);
  e.currentTarget.textContent = som ? '🔊 Som' : '🔇 Som';
};

montarRegras();
reset();
