// player.js — controles (WASD / E / R) e movimentação com colisão.
class Controls {
  constructor({ onInteract, onRestart }) {
    this.keys = new Set();
    window.addEventListener("keydown", e => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; // não captura o campo de roteiro
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "e", "r", " "].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (e.repeat) return;                       // segurar a tecla não repete a ação
      if (k === "e") onInteract();
      if (k === "r") onRestart();
    });
    window.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
  }
  has(k) { return this.keys.has(k); }
}

class Player {
  constructor() { this.reset(); }
  reset() { this.x = 120; this.y = 296; this.w = 22; this.h = 26; this.speed = 3.1; this.face = "down"; this.step = 0; }

  hitbox(x = this.x, y = this.y) { return { x: x + 2, y: y + 12, w: 18, h: 14 }; }   // “pés” do personagem
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, controls, isBlocked) {
    const s = this.speed * (dt / 16.67);
    let dx = (controls.has("d") ? 1 : 0) - (controls.has("a") ? 1 : 0);
    let dy = (controls.has("s") ? 1 : 0) - (controls.has("w") ? 1 : 0);
    if (!dx && !dy) return;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    this.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    // eixos separados: permite deslizar ao longo das paredes
    if (!isBlocked(this.hitbox(this.x + dx * s, this.y))) this.x += dx * s;
    if (!isBlocked(this.hitbox(this.x, this.y + dy * s))) this.y += dy * s;
    this.step += s;
  }

  draw(c) {
    const { x, y } = this, bob = Math.floor(this.step / 9) % 2, f = this.face;
    c.fillStyle = "#00000022"; c.fillRect(x + 2, y + 25, 19, 3);
    c.fillStyle = "#354a3c"; c.fillRect(x + 3, y + 21 + (bob ? 1 : 0), 7, 5); c.fillRect(x + 14, y + 21 + (bob ? 0 : 1), 7, 5);
    c.fillStyle = "#496f9a"; c.fillRect(x + 2, y + 10, 20, 13);
    c.fillStyle = "#e5b88c"; c.fillRect(x + 4, y, 16, 13);
    c.fillStyle = "#5b4435"; c.fillRect(x + 3, y - 2, 17, f === "up" ? 10 : 5);
    c.fillStyle = "#2d342e";
    if (f === "left") c.fillRect(x + 5, y + 6, 3, 3); else if (f === "right") c.fillRect(x + 16, y + 6, 3, 3);
    else if (f === "down") { c.fillRect(x + 7, y + 6, 3, 3); c.fillRect(x + 14, y + 6, 3, 3); }
    c.fillStyle = "#d4a16c"; c.fillRect(x + 1, y + 13, 3, 7); c.fillRect(x + 21, y + 13, 3, 7);
  }
}
