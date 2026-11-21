// audio.js — sons do jogo. Cada evento tem um arquivo opcional; sem arquivo, toca um bip sintetizado.
// Para usar seus sons: coloque os arquivos em assets/audio/ e troque null pelo caminho, ex.: "assets/audio/coleta.mp3".
const SOUND_FILES = {
  click:   null,   // clique em botões
  collect: null,   // coletar tábua
  place:   null,   // encaixar tábua na ponte
  reject:  null,   // ação negada pelo autômato
  win:     null,   // moinho reativado
  music:   null    // trilha de fundo (loop)
};
const SYNTH_TONES = {      // [frequência Hz, duração s] em sequência
  click: [[660, .04]], collect: [[520, .07], [780, .09]], place: [[300, .06], [240, .09]],
  reject: [[220, .12], [160, .18]], win: [[523, .12], [659, .12], [784, .12], [1047, .32]]
};

const Sound = {
  ctx: null, bgm: null,
  volume() { return Settings.get("muted") ? 0 : Settings.get("volume"); },
  play(name) {
    const vol = this.volume(); if (vol <= 0) return;
    const file = SOUND_FILES[name];
    if (file) { const a = new Audio(file); a.volume = vol; a.play().catch(() => this.synth(name, vol)); }
    else this.synth(name, vol);
  },
  synth(name, vol) {
    const notes = SYNTH_TONES[name]; if (!notes) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      let t = this.ctx.currentTime;
      for (const [f, d] of notes) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "square"; o.frequency.value = f; g.gain.setValueAtTime(vol * 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d); t += d;
      }
    } catch (e) { /* navegador sem áudio */ }
  },
  music(on) {
    if (!SOUND_FILES.music) return;
    if (!on) { this.bgm?.pause(); return; }
    this.bgm = this.bgm || Object.assign(new Audio(SOUND_FILES.music), { loop: true });
    this.refresh(); this.bgm.play().catch(() => {});
  },
  refresh() { if (this.bgm) this.bgm.volume = this.volume() * 0.6; }
};
Settings.onChange(() => Sound.refresh());
