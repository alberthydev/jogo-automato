// map.js — mapa, colisões, objetos interativos e desenho do mundo.
// O mapa NÃO decide nada sobre o PDA: ele apenas recebe o estado do mundo (`world`)
// e o desenha. Quem libera a ponte/moinho é o PDA, via game.js.

const W = 960, H = 640;                       // 30 × 20 blocos de 32 px
const RIVER = { x: 704, w: 64 };              // rio vertical
const LANE_H = 32;
const LANES_Y = [256, 288, 320];              // 3 faixas da ponte (blocos 8, 9 e 10)
const LANE_FILL_ORDER = [1, 0, 2];            // a faixa do meio é a primeira a ser construída
const TREES = [[350,95],[430,90],[555,110],[620,165],[350,430],[610,445],[535,505],[390,520],[625,540],[880,440],[915,540],[830,560]];
const HOUSE = { x: 70, y: 95 }, MILL = { x: 808, y: 96 };

const AREAS = [
  { id: "fazenda", name: "A Fazenda", from: 0 }, { id: "bosque", name: "O Bosque", from: 330 },
  { id: "ponte", name: "A Ponte", from: 668 }, { id: "moinho", name: "O Moinho", from: 790 }
];
const areaAt = x => [...AREAS].reverse().find(a => x >= a.from);

const SPOTS = {                               // pontos de interação
  letter: { x: 215, y: 244, label: "Carta do avô", range: 58 },
  bridge: { x: 676, y: 304, label: "Ponte em reconstrução", range: 56 },
  gate:   { x: 868, y: 298, label: "Portão do moinho", range: 56 },
  mill:   { x: 867, y: 268, label: "Entrada do moinho", range: 50 }
};
const KEY_SPOTS = [{ x: 822, y: 332 }, { x: 900, y: 340 }, { x: 930, y: 400 }];   // chaves na margem leste
const GATE_RECT = { x: 846, y: 284, w: 44, h: 8 };                                // portão (bloqueia até abrir)
const PLANK_SPOTS = [{ x: 430, y: 170 }, { x: 520, y: 410 }, { x: 585, y: 222 }];

const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

class FarmMap {
  constructor() {
    // Obstáculos sólidos (retângulos de colisão).
    this.solids = [
      { x: 74, y: 100, w: 124, h: 111 },                              // casa
      { x: 812, y: 100, w: 104, h: 150 },                             // moinho
      { x: 45, y: 420, w: 155, h: 8 }, { x: 232, y: 420, w: 48, h: 8 }, // cerca da horta (com abertura)
      { x: 796, y: 60, w: 8, h: 232 }, { x: 796, y: 60, w: 156, h: 8 },  // cerca do pátio do moinho
      { x: 796, y: 284, w: 50, h: 8 }, { x: 890, y: 284, w: 62, h: 8 },  // (a entrada é o portão, entre as duas)
      ...TREES.map(([x, y]) => ({ x: x - 16, y: y + 10, w: 34, h: 32 }))
    ];
  }

  /** Faixas da ponte que já receberam uma tábua. */
  filledLanes(boards) { return LANE_FILL_ORDER.slice(0, Math.min(boards, 3)).sort(); }

  /** Intervalos verticais (contíguos) caminháveis sobre o rio. */
  walkableSpans(boards) {
    const spans = [];
    for (const l of this.filledLanes(boards)) {
      const y0 = LANES_Y[l], y1 = y0 + LANE_H, last = spans[spans.length - 1];
      if (last && last[1] === y0) last[1] = y1; else spans.push([y0, y1]);
    }
    return spans;
  }

  /** O retângulo (hitbox do jogador) bate em algo? `w` = { bridgeOpen, gateOpen, boards }, derivado do PDA. */
  isBlocked(r, w) {
    if (r.x < 8 || r.y < 8 || r.x + r.w > W - 8 || r.y + r.h > H - 8) return true;
    if (this.solids.some(s => rectsOverlap(r, s))) return true;
    if (!w.gateOpen && rectsOverlap(r, GATE_RECT)) return true;
    if (r.x + r.w > RIVER.x && r.x < RIVER.x + RIVER.w) {            // dentro da faixa do rio
      if (!w.bridgeOpen) return true;
      return !this.walkableSpans(w.boards).some(([y0, y1]) => r.y >= y0 && r.y + r.h <= y1);
    }
    return false;
  }

  // ------------------------------------------------------------------ desenho
  draw(c, world, t) {
    const { planks, keys, boards, bridgeOpen, gateOpen, finishT, finished } = world;
    c.clearRect(0, 0, W, H);
    for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) {          // grama
      c.fillStyle = ((x + y) / 32) % 2 === 0 ? "#91b17b" : "#89a974"; c.fillRect(x, y, 32, 32);
      c.fillStyle = "#7e9f69"; c.fillRect(x + 7, y + 8, 3, 3); c.fillRect(x + 22, y + 23, 2, 2);
    }
    c.fillStyle = "#c9b486"; c.fillRect(0, 250, 704, 108); c.fillRect(96, 211, 64, 40); c.fillRect(768, 250, 192, 108);
    c.fillStyle = "#d5c197"; c.fillRect(0, 262, 704, 84); c.fillRect(768, 262, 192, 84);
    c.fillStyle = "#c9b486"; c.fillRect(850, 204, 36, 50);                      // trilha até a porta do moinho
    this.drawRiver(c, t);
    this.drawHouse(c, HOUSE.x, HOUSE.y);
    this.drawMailbox(c, 215, 222, !world.letterRead);
    this.drawFence(c);
    this.drawYard(c, gateOpen);
    this.drawCrops(c, 45, 440, 235, 150, finishT);
    this.drawCrops(c, 790, 400, 150, 190, finishT);
    TREES.forEach(([x, y]) => this.drawTree(c, x, y));
    planks.forEach(p => { if (!p.collected) this.drawPlank(c, p.x, p.y); });
    keys.forEach(k => { if (!k.collected) this.drawKey(c, k.x, k.y); });
    this.drawBridge(c, boards, bridgeOpen);
    this.drawMill(c, MILL.x, MILL.y, finished || finishT > 0, t);
    this.sign(c, "FAZENDA", 52, 40); this.sign(c, "BOSQUE", 440, 40); this.sign(c, "PONTE", 692, 396); this.sign(c, "MOINHO", 825, 40);
  }

  drawRiver(c, t) {
    c.fillStyle = "#63865b"; c.fillRect(RIVER.x - 16, 0, 16, H); c.fillRect(RIVER.x + RIVER.w, 0, 16, H);
    c.fillStyle = "#5b9b9a"; c.fillRect(RIVER.x, 0, RIVER.w, H);
    const off = (t / 40) % 35;
    for (let y = -35; y < H; y += 35) { c.fillStyle = "#8bc2b6"; c.fillRect(712 + (y % 3 + 3) % 3 * 5, y + off, 25, 3); c.fillRect(738, y + 13 + off, 12, 2); }
  }

  drawBridge(c, boards, open) {
    const x = RIVER.x - 16, w = RIVER.w + 32;
    c.fillStyle = "#4b4537"; c.fillRect(x, 250, w, 6); c.fillRect(x, 352, w, 6);           // vigas laterais
    const filled = this.filledLanes(boards);
    LANES_Y.forEach((y, i) => {
      const on = filled.includes(i);
      c.fillStyle = on ? "#c99b5c" : "#51493a"; c.fillRect(x + 4, y + 2, w - 8, LANE_H - 4);
      c.fillStyle = on ? "#e0b778" : "#665b47"; c.fillRect(x + 7, y + 5, w - 14, 3);
      if (on) { c.fillStyle = "#9c7440"; for (let k = 0; k < 4; k++) c.fillRect(x + 14 + k * 26, y + 2, 2, LANE_H - 4); }
    });
    if (open) { c.fillStyle = "#e2c18a"; c.fillRect(x, 250, w, 6); c.fillRect(x, 352, w, 6); }
  }

  drawHouse(c, x, y) {
    c.fillStyle = "#72533e"; c.fillRect(x + 8, y + 28, 115, 88); c.fillStyle = "#b66c4c";
    c.beginPath(); c.moveTo(x, y + 32); c.lineTo(x + 65, y - 10); c.lineTo(x + 132, y + 32); c.closePath(); c.fill();
    c.fillStyle = "#e4d2a7"; c.fillRect(x + 18, y + 42, 95, 68); c.fillStyle = "#6a8c83"; c.fillRect(x + 30, y + 54, 23, 23); c.fillRect(x + 78, y + 54, 23, 23);
    c.fillStyle = "#6b4d36"; c.fillRect(x + 57, y + 76, 25, 40); c.fillStyle = "#d7b87e"; c.fillRect(x + 76, y + 93, 3, 3);
  }
  drawMailbox(c, x, y, hasLetter) {
    c.fillStyle = "#6b4d36"; c.fillRect(x - 2, y + 4, 5, 22); c.fillStyle = "#9a4a3c"; c.fillRect(x - 11, y - 8, 24, 14);
    if (hasLetter) { c.fillStyle = "#fffdf0"; c.fillRect(x - 8, y - 14, 18, 10); c.fillStyle = "#c9b486"; c.fillRect(x - 8, y - 14, 18, 2); }
  }
  drawTree(c, x, y) {
    c.fillStyle = "#74533a"; c.fillRect(x - 5, y + 12, 12, 30); c.fillStyle = "#426b45"; c.fillRect(x - 20, y - 5, 42, 34);
    c.fillStyle = "#527e4c"; c.fillRect(x - 13, y - 15, 30, 28); c.fillStyle = "#75935a"; c.fillRect(x - 7, y - 11, 8, 8);
  }
  drawPlank(c, x, y) {
    c.fillStyle = "#755334"; c.fillRect(x - 14, y - 5, 30, 11); c.fillStyle = "#d1a46a"; c.fillRect(x - 12, y - 4, 26, 7);
    c.fillStyle = "#69482e"; c.fillRect(x - 8, y - 2, 2, 2); c.fillRect(x + 7, y - 2, 2, 2);
  }
  drawFence(c) {
    c.fillStyle = "#725638";
    for (let x = 45; x < 280; x += 28) if (x < 200 || x > 225) c.fillRect(x, 414, 5, 20);
    c.fillRect(45, 420, 155, 4); c.fillRect(232, 420, 48, 4);
  }
  drawKey(c, x, y) {
    c.fillStyle = "#8a6a1f"; c.fillRect(x - 11, y - 6, 12, 12); c.fillStyle = "#f0c64a"; c.fillRect(x - 10, y - 5, 10, 10);
    c.fillStyle = "#fffdf0"; c.fillRect(x - 7, y - 2, 4, 4);                       // aro
    c.fillStyle = "#f0c64a"; c.fillRect(x, y - 2, 14, 4); c.fillRect(x + 9, y + 2, 3, 5); c.fillRect(x + 4, y + 2, 3, 4); // haste e dentes
  }
  drawYard(c, open) {                // cerca do pátio + portão
    c.fillStyle = "#725638";
    c.fillRect(796, 60, 8, 232); c.fillRect(796, 60, 156, 8); c.fillRect(796, 284, 50, 8); c.fillRect(890, 284, 62, 8);
    for (let y = 70; y < 284; y += 24) { c.fillStyle = "#8b6a44"; c.fillRect(794, y, 12, 5); }
    for (let x = 806; x < 950; x += 24) { c.fillStyle = "#8b6a44"; c.fillRect(x, 58, 5, 12); }
    if (!open) {                     // portão fechado com cadeado
      c.fillStyle = "#9b7440"; c.fillRect(846, 280, 44, 14); c.fillStyle = "#6d5238"; c.fillRect(846, 285, 44, 3);
      c.fillStyle = "#e0b43c"; c.fillRect(864, 279, 10, 12); c.fillStyle = "#3b3326"; c.fillRect(867, 283, 4, 4);
    } else {                         // portão aberto: folhas recolhidas nas laterais
      c.fillStyle = "#9b7440"; c.fillRect(846, 276, 5, 20); c.fillRect(885, 276, 5, 20);
    }
  }
  drawCrops(c, x0, y0, w, h, grow) {   // decorativo: brota quando a fazenda é restaurada
    for (let y = y0; y < y0 + h - 12; y += 28) for (let x = x0; x < x0 + w - 18; x += 35) {
      c.fillStyle = "#6f5438"; c.fillRect(x, y + 6, 20, 8);
      c.fillStyle = grow > 0 ? "#4f8a3f" : "#7a6a4a"; const hh = 3 + Math.round(grow * 9); c.fillRect(x + 8, y + 6 - hh, 4, hh);
      if (grow > 0.6) { c.fillStyle = "#e6c24f"; c.fillRect(x + 5, y - 6 - Math.round(grow * 2), 10, 5); }
    }
  }
  drawMill(c, x, y, on, t) {
    c.fillStyle = "#9b7951"; c.fillRect(x + 12, y + 54, 92, 100); c.fillStyle = "#6d5238";
    c.beginPath(); c.moveTo(x, y + 60); c.lineTo(x + 58, y + 5); c.lineTo(x + 116, y + 60); c.closePath(); c.fill();
    c.fillStyle = "#d2b27d"; c.fillRect(x + 23, y + 67, 70, 80); c.fillStyle = "#58432e"; c.fillRect(x + 48, y + 108, 22, 46);
    c.fillStyle = on ? "#f3d77d" : "#d9c293"; c.fillRect(x + 37, y + 79, 15, 18); c.fillRect(x + 66, y + 79, 15, 18);
    const a = on ? t / 450 : 0.4;                                              // pás giram quando o moinho é reativado
    c.strokeStyle = on ? "#e5d6a4" : "#5a4935"; c.lineWidth = 7;
    c.beginPath(); for (let k = 0; k < 4; k++) { const r = a + k * Math.PI / 2; c.moveTo(x + 58, y + 20); c.lineTo(x + 58 + Math.cos(r) * 46, y + 20 + Math.sin(r) * 46); } c.stroke();
    c.fillStyle = on ? "#f3d77d" : "#5a4935"; c.fillRect(x + 53, y + 15, 10, 10);
  }
  sign(c, text, x, y) {
    c.fillStyle = "#314733aa"; c.fillRect(x - 7, y - 15, text.length * 7 + 14, 22);
    c.fillStyle = "#f4f0dc"; c.font = "bold 10px monospace"; c.fillText(text, x, y);
  }

  /** Clima: tempestade se aproximando até a conclusão; luz dourada ao final. */
  drawWeather(c, world, t) {
    if (world.finishT > 0) { c.fillStyle = `rgba(255,214,120,${0.16 * world.finishT})`; c.fillRect(0, 0, W, H); return; }
    c.fillStyle = "rgba(28,40,66,0.20)"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(190,210,235,0.35)"; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 45; i++) { const x = (i * 97 + t * 0.25) % W, y = (i * 53 + t * 0.7) % H; c.moveTo(x, y); c.lineTo(x - 4, y + 10); }
    c.stroke();
  }
}
