// settings.js — configurações do jogador. Para criar uma opção nova, basta acrescentar
// uma linha em SETTINGS_SCHEMA: a tela de Configurações é gerada a partir dessa tabela.
const SETTINGS_SCHEMA = [
  { key: "volume",      label: "Volume geral",                 type: "range",  min: 0,   max: 1, step: 0.05, default: 0.7 },
  { key: "muted",       label: "Silenciar tudo",               type: "toggle", default: false },
  { key: "scriptSpeed", label: "Velocidade do personagem no modo sequência", type: "range", min: 0.5, max: 3, step: 0.25, default: 1.5 }
];

const Settings = {
  STORAGE_KEY: "ultima-colheita:settings",
  values: {},
  listeners: [],
  load() {
    this.values = Object.fromEntries(SETTINGS_SCHEMA.map(d => [d.key, d.default]));
    try { Object.assign(this.values, JSON.parse(localStorage.getItem(this.STORAGE_KEY) || "{}")); } catch (e) { /* sem armazenamento: usa padrões */ }
  },
  save() { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.values)); } catch (e) { /* ignora */ } },
  get(key) { return this.values[key]; },
  set(key, value) { this.values[key] = value; this.save(); this.listeners.forEach(f => f(key, value)); },
  reset() { SETTINGS_SCHEMA.forEach(d => this.set(d.key, d.default)); },
  onChange(fn) { this.listeners.push(fn); }
};
Settings.load();
