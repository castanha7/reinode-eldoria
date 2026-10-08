# Reino de Eldoria 🏰

Um **RPG 2D top-down em pixel art** medieval/fantasia, 100% jogável no navegador.
Toda a arte é **gerada proceduralmente em pixel art** (sem arquivos de imagem): sprites de
heróis, inimigos, NPCs, construções, tiles, armas e efeitos são desenhados em código.

> Explore um reino aberto com cidade, castelo, floresta, campos, ruínas, vale sombrio e uma
> masmorra com chefe. Lute em tempo real, suba de nível, abra baús, equipe itens da sua
> classe, faça missões e derrote o **Guardião das Profundezas** — além de três senhores
> das trevas opcionais (Vyrka, Maldrak e Grommash).

## Como jogar

Sirva a pasta com qualquer servidor estático (o jogo é ES modules puro, sem build):

```bash
npm start            # python3 -m http.server 8080
# ou
npx serve .
```

Abra `http://localhost:8080` e escolha uma classe.

### Modos de jogo

| Modo | Regras |
|------|--------|
| **Aventura** | Vidas ilimitadas. Ao cair você acorda na cidade e perde 15% do ouro. |
| **Clássico** | **3 vidas** para zerar o jogo (máx. 5 com a *Pena da Fênix*). Zerou as vidas = fim de jogo e o save é apagado. Inimigos e recompensas 10% maiores. |
| **Hardcore** | **Uma única chance.** Inimigos com +40% de vida e +35% de dano, regeneração reduzida. Morreu = save apagado. |

Concluir a missão final (derrotar o Guardião) é a **vitória**: o troféu do modo/classe fica
registrado na tela de título e você pode continuar explorando.

### Controles (teclado e mouse)

| Tecla | Ação |
|-------|------|
| `WASD` / setas | Mover |
| Mouse | Mirar |
| Clique esq. (segurar) | Ataque básico |
| `1` `2` `3` `4` | Habilidades da classe (com cooldown) |
| `Espaço` | Esquiva (rolamento com invulnerabilidade curta) |
| `E` | Interagir (NPC, baú, portal) |
| `R` | Beber poção de vida |
| `I` | Inventário / equipamento |
| `Q` | Diário de missões |
| `H` | Ajuda |
| `M` / `N` | Música / efeitos |
| `ESC` | Pausa / fechar painel |

### Celular / tablet

Os controles de toque ativam sozinhos em telas touch (ou force com `?touch=1`; desative com
`?touch=0`):

- **Joystick virtual** flutuante na metade esquerda da tela (aparece onde você toca).
- **Botão ⚔ de atirar**: mira automática no inimigo mais próximo; *arraste* o dedo sobre o
  botão para mirar manualmente.
- Botões das 4 habilidades (com recarga), esquiva, interagir (✋) e atalhos de inventário,
  missões, poção e menu.
- HUD e zoom se adaptam ao tamanho da tela.

## Conteúdo

- **4 classes** distintas: Mago, Cavaleiro, Arqueiro e Assassino — cada uma com atributos,
  4 habilidades, ataque básico, arma e visual próprios.
- **Progressão**: XP, níveis, atributos crescentes, habilidades desbloqueadas por nível.
- **Equipamentos por classe**: baús dão itens apropriados à sua classe em 4 raridades;
  slots de arma/armadura/reliquia; loja, venda, reforjo no ferreiro, cura na capela.
- **Combate em tempo real**: crítico, esquiva, roubo de vida, knockback, lentidão,
  projéteis, feixes, novas, investidas, giros e chuva de flechas.
- **21 tipos de inimigo** com IA própria (perseguidor, arqueiro, investidor, brutamontes,
  ladrão que rouba ouro, espectro que drena vida, aranha que lança teias...), elite e
  **4 chefes de 3 fases** com padrões próprios: o Guardião (masmorra), Vyrka (Floresta
  Profunda), Maldrak (Ruínas) e Grommash (Vale Sombrio, cratera de lava).
- **Mundo aberto** com 3 mapas conectados (mundo, masmorra, sala do trono), rio com pontes,
  **3 áreas secretas**, ~30 baús e 19 NPCs com diálogos.
- **14 consumíveis** (elixires, pergaminhos do Trovão e de Retorno, Pena da Fênix...),
  alquimista, bardo (canções com bônus temporário) e mais NPCs: pescador, aldeões,
  eremita, viajante, cão e gato que passeiam pela cidade.
- **10 missões** de 3 NPCs (rei, Capitão Dorn, caçadora Yara), algumas encadeadas e outras
  exigindo abates em zonas específicas.
- **HUD completa**: barras de vida/mana/XP, nível, ouro, habilidades com cooldown,
  minimapa, barra do chefe, avisos e cartão de loot.
- **Áudio sintetizado** (WebAudio): SFX e trilha ambiente, sem arquivos externos.
- **Save automático** (localStorage): modo, vidas, bônus, baús abertos e chefes derrotados persistem.

## Testes

Uma suíte headless executa o **código real** do jogo (sprites, mapa, entidades, combate,
UI) em Node, sem browser:

```bash
npm test
```

Também há um rasterizador que gera PNGs reais da arte e de trechos do mapa (para inspeção
visual):

```bash
npm run shots   # grava PNGs em /home/user/shots (ou $SHOT_DIR)
```

## Estrutura

```
index.html            shell + painéis de UI (DOM)
styles.css            tema medieval da interface
src/
  main.js             bootstrap + loop + teclas globais
  sprites.js          toda a pixel art procedural
  sprites_extra.js    sprites dos novos inimigos, chefes, NPCs, ícones de habilidades
  core/               pixel, rng, input, áudio, câmera, partículas
  data/               classes, itens, inimigos, NPCs, missões, modos de jogo
  world/              tiles, mapa (acesso/colisão/desenho), geração de mundos
  game/               game, player, enemy, npc, projectile, abilities, combat
  ui/                 hud (canvas), panels (DOM), touch (joystick e botões)
tests/                harness DOM/canvas, suíte, rasterizador, gerador de PNGs
```

## Correções notáveis

- Colisão: água agora bloqueia o movimento (projéteis ainda passam) e o jogador não fica
  preso em props; baús, NPCs e inimigos que nasciam dentro de árvores/água/áreas isoladas
  são realocados para pontos alcançáveis (validado por busca em largura no teste).
- Baús: não somem mais com a mochila cheia (não abrem e avisam); itens recebidos de outras
  fontes com mochila cheia são vendidos automaticamente; baú aberto não bloqueia mais a
  interação com NPCs; baús abertos e chefes mortos persistem no save.
- Armas: o arco é desenhado na orientação correta e a mira por toque usa a altura do corpo.
- O jogo pausa com painéis abertos; a morte é confirmada pelo jogador; viagens respeitam o
  ponto de chegada; missões de abate respeitam a zona exigida.
