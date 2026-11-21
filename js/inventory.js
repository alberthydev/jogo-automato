// inventory.js — controle VISUAL dos itens carregados. Espelha a pilha do PDA
// (B = tábua na mão, K = chave na mão); não toma nenhuma decisão de regra.
class Inventory {
  constructor(el, capacity = 3) { this.el = el; this.capacity = capacity; this.render({ boards: 0, keys: 0 }, 0, 0); }
  render(v, placedBoards, usedKeys) {
    if (!this.el) return;
    this.el.innerHTML = "";
    [["Tábuas", "plank", v.boards, placedBoards, "na ponte"], ["Chaves", "key", v.keys, usedKeys, "no portão"]].forEach(([name, kind, held, used, where]) => {
      const row = document.createElement("div"); row.className = "inv-row";
      const lab = document.createElement("b"); lab.textContent = name; row.append(lab);
      for (let i = 0; i < this.capacity; i++) {
        const slot = document.createElement("span");
        slot.className = `inv-slot ${kind}` + (i < held ? " full" : "");
        slot.title = i < held ? `${name.slice(0, -1)} carregada (${kind === "plank" ? "B" : "K"} na pilha)` : "Espaço livre";
        row.append(slot);
      }
      const txt = document.createElement("small"); txt.textContent = `${held} na mão · ${used} ${where}`; row.append(txt);
      this.el.append(row);
    });
  }
}
