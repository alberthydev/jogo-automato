# A Última Colheita

Jogo web 2D (top-down, pixel art) cuja progressão é controlada por um **Autômato de Pilha (PDA)**. HTML + CSS + JavaScript puro, Canvas API, sem dependências e sem build. Trabalho 02 de LFA.

> **Link do jogo (GitHub Pages):** _preencher após publicar_ — `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`

## Enredo
Você volta à fazenda do avô. A ponte do rio caiu e o moinho está trancado atrás de um portão. Colete tábuas e reconstrua a ponte; depois colete as chaves na outra margem, abra o portão e reative o moinho antes da tempestade.

## Como jogar
O jogo abre num **menu** (*Iniciar*, *Configurações*, *Como jogar*). Em *Iniciar* há dois modos:
- **Jogar:** `W A S D` movem · `E` interage · `R` reinicia. O que você faz gera a sequência em tempo real.
- **Enviar sequência:** digite uma sequência de `a b c d e`; o personagem a executa no mapa e o autômato diz se chega ao final.

O laboratório (exemplos + campo de sequência) fica disponível **nos dois modos**. Caminhar não gera símbolos; só ações geram. Uma ação negada pelo PDA mostra o motivo, entra na sequência como tentativa (em vermelho) e **não altera o autômato**.

## O PDA
`M = (Q, Σ, Γ, δ, q0, Z, F)` · `Q = {q0..q7}` (8 estados) · `Σ = {a, b, c, d, e}` · `Γ = {Z, B, K}` · `F = {q7}` · aceitação por estado final.

**`L = { aⁿ bⁿ cᵐ dᵐ e | n > 0, m > 0 }`**

| Símbolo | Evento no jogo | Pilha |
|---|---|---|
| `a` | coletar tábua | empilha `B` |
| `b` | usar tábua na ponte | desempilha `B` |
| `c` | coletar chave | empilha `K` |
| `d` | usar chave no portão | desempilha `K` |
| `e` | entrar no moinho | exige apenas `Z` |

| Estado | Nome | | Estado | Nome |
|---|---|---|---|---|
| q0 | Início (inicial) | | q4 | Coletando chaves |
| q1 | Coletando madeira | | q5 | Abrindo o portão |
| q2 | Reconstruindo a ponte | | q6 | Portão aberto |
| q3 | Ponte concluída | | q7 | Fazenda restaurada (final) |

| Origem | Lê | Topo | Destino | Empilha | | Origem | Lê | Topo | Destino | Empilha |
|---|---|---|---|---|---|---|---|---|---|---|
| q0 | ε | Z | q1 | Z | | q4 | c | K | q4 | KK |
| q1 | a | Z | q1 | BZ | | q4 | ε | K | q5 | K |
| q1 | a | B | q1 | BB | | q5 | d | K | q5 | ε |
| q1 | ε | B | q2 | B | | q5 | ε | Z | q6 | Z |
| q2 | b | B | q2 | ε | | q6 | e | Z | q7 | Z |
| q2 | ε | Z | q3 | Z | | q3 | c | Z | q4 | KZ |

“Empilha” substitui o topo (topo à esquerda, como no JFLAP). O PDA é **não determinístico** (`js/pda.js` mantém o conjunto de configurações e calcula o fecho-ε). Não há regex nem contadores: só transições e pilha. As transições `q1→q2` e `q4→q5` exigem `B`/`K` no topo, o que garante `n > 0` e `m > 0`.

### Como a pilha limita o jogo
Toda ação gera um símbolo e passa por `session.feed()`. A **ponte** só abre quando o PDA está em q3..q7; o **portão** só abre em q6..q7; o **moinho** só aceita `e` em q6. Tudo é lido do estado do PDA, nunca de contadores paralelos.

## Requisitos do trabalho
| Requisito | Onde |
|---|---|
| Enredo, personagem, caminhos, itens, passagens, objetivo | jogo (tábuas/ponte, chaves/portão, moinho) |
| WASD gera o roteiro em tempo real | modo *Jogar*: painel “Sequência gerada” |
| Roteiro por letras processado pelo PDA | modo *Enviar sequência* e laboratório |
| Pilha influencia/limita o jogo | ponte, portão e moinho (acima) |
| Identificar ACEITA / REJEITADA | caixa de veredito do monitor e resultado do laboratório |
| 4 situações/exemplos na interface | 6 botões de exemplo (2 aceitas, 4 rejeitadas) |
| Diagrama e regras de transição | diagrama gerado + tabela na página; `docs/ultima-colheita.jff` para o JFLAP |
| 5 a 10 estados | 8 estados |
| Estado atual, símbolo e pilha em tempo real | monitor do autômato |
| HTML/CSS/JS no GitHub Pages | publicar conforme abaixo |

## JFLAP
`docs/ultima-colheita.jff` é gerado da mesma definição do jogo (`npm run jff`). No JFLAP: *File → Open*, depois *Input → Multiple Run* (aceitação por estado final) com `abcde`, `aabbccdde`, `aabcde`, `aabbccde`. Para exibir o print do JFLAP na página, salve a imagem em `docs/` e informe o caminho em `JFLAP_IMAGE` (topo de `js/main.js`).

## Executar e testar
Dê **duplo clique em `index.html`** (scripts clássicos; não precisa de servidor) ou use `python -m http.server`.
`npm test` (Node 18+) compara o PDA com a definição de L em ~98 mil sequências e testa a sessão do jogo.

## Personalizar
- **Configurações:** `js/settings.js` → uma linha em `SETTINGS_SCHEMA` cria a opção na tela.
- **Sons:** arquivos em `assets/audio/` + `SOUND_FILES` em `js/audio.js` (click, collect, place, reject, win, music); sem arquivo, toca um bip sintetizado.

## Estrutura
```text
index.html · css/style.css
js/  dom · settings · audio · pda (autômato) · tests (casos) · map · player · inventory · game (regras) · lab (roteiro manual) · main (UI/menu)
assets/audio/ · docs/ultima-colheita.jff · docs/gerar_jff.mjs · tests/run.mjs · package.json
```

## Publicar no GitHub Pages
1. Crie o repositório e envie todos os arquivos mantendo as pastas.
2. **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
3. Cole o link no topo deste README e envie no SIGAA até **26/11/2026, 23h59**.
