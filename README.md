# A Última Colheita

Uma aventura 2D para a disciplina de Linguagens Formais e Autômatos. Explore o bosque alagado, reconstrua a ponte, procure as chaves no pomar e acione a alavanca do moinho.

Abra [index.html](index.html) no navegador. Use **WASD** para mover, **E** para interagir e **R** para reiniciar. No **Laboratório de sequências**, digite uma sequência para ver o personagem executá-la ou desmarque a execução no mapa para testar só o autômato.

## Como a pilha controla o jogo

A pilha começa com `Z` no fundo. O [autômato de pilha](js/pda.js) recebe uma letra a cada ação da tabela e decide se ela pode acontecer. A mochila mostra quantos itens ainda estão na pilha.

| Letra | Ação | Efeito |
|---|---|---|
| `a` | Coletar uma tábua | Coloca um `B` na pilha. |
| `b` | Usar uma tábua | Retira um `B`. A ponte libera a travessia em `q3`, depois de usar todas as tábuas coletadas. |
| `c` | Coletar uma chave | Coloca um `K` na pilha. Só é permitido depois da ponte. |
| `d` | Usar uma chave | Retira um `K`. O portão abre em `q6`, depois de usar todas as chaves coletadas. |
| `e` | Acionar a alavanca | Exige `q6` e apenas `Z` na pilha. Leva a `q7`, o estado final. |

Por exemplo, **`aabbcde`** coleta duas tábuas, usa as duas, coleta e usa uma chave e aciona a alavanca. A pilha evolui assim, com o topo à direita:

```text
Z → ZB → ZBB → ZB → Z → ZK → Z → Z
```

Já **`aabcde`** falha em `c` porque ainda sobra uma tábua. Durante a partida, uma ação negada aparece em vermelho e deixa o estado e a pilha como estavam. Caminhar, ler recados e entrar no prédio não geram letras.

O autômato tem oito estados (`q0` a `q7`) e reconhece **aⁿbⁿcᵐdᵐe**, com `n, m > 0`. O reconhecimento exige consumir toda a entrada e chegar a `q7`. No mapa há três tábuas e três chaves. A simulação sem mapa também testa quantidades maiores.

## Testes e diagrama

Rode `npm test` com Node.js 18 ou superior. Abra **Laboratório · sequência e pilha** para ver o estado atual, as transições e os exemplos. O [arquivo JFLAP](docs/ultima-colheita.jff) é gerado da mesma definição com `npm run jff`.
