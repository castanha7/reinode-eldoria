# Reino de Eldoria 🏰

Um **RPG 2D top-down em pixel art** medieval/fantasia, 100% jogável no navegador.
Toda a arte é **gerada proceduralmente em pixel art** (sem arquivos de imagem): sprites de
heróis, inimigos, NPCs, construções, tiles, armas e efeitos são desenhados em código.

> Explore um reino aberto com cidade, castelo, floresta, campos, ruínas, vale sombrio e uma
> masmorra com chefe. Lute em tempo real, suba de nível, abra baús, equipe itens da sua
> classe, faça missões para o rei e derrote o **Guardião das Profundezas**.

## Como jogar

Sirva a pasta com qualquer servidor estático (o jogo é ES modules puro, sem build):

```bash
npm start            # python3 -m http.server 8080
# ou
npx serve .
```

Abra `http://localhost:8080` e escolha uma classe.

### Controles

| Tecla | Ação |
|-------|------|
| `WASD` / setas | Mover |
| Mouse | Mirar |
| Clique esq. (segurar) | Ataque básico |
| `1` `2` `3` | Habilidades da classe (com cooldown) |
| `E` | Interagir (NPC, baú, portal) |
| `R` | Beber poção de vida |
| `I` | Inventário / equipamento |
| `Q` | Diário de missões |
| `H` | Ajuda |
| `M` / `N` | Música / efeitos |
| `ESC` | Pausa / fechar painel |

## Conteúdo

- **4 classes** distintas: Mago, Cavaleiro, Arqueiro e Assassino — cada uma com atributos,
  3 habilidades, ataque básico, arma e visual próprios.
- **Progressão**: XP, níveis, atributos crescentes, habilidades desbloqueadas por nível.
- **Equipamentos por classe**: baús dão itens apropriados à sua classe em 4 raridades;
  slots de arma/armadura/reliquia; loja, venda, reforjo no ferreiro, cura na capela.
- **Combate em tempo real**: crítico, esquiva, roubo de vida, knockback, lentidão,
  projéteis, feixes, novas, investidas, giros e chuva de flechas.
- **11 tipos de inimigo** com IA própria (perseguidor, arqueiro, investidor, brutamontes),
  elite e um **chefe de 3 fases** que invoca crias e dispara rajadas.
- **Mundo aberto** com 3 mapas conectados (mundo, masmorra, sala do trono), rio com pontes,
  **3 áreas secretas**, ~30 baús e 19 NPCs com diálogos.
- **Missões** encadeadas dadas pelo rei, com recompensas.
- **HUD completa**: barras de vida/mana/XP, nível, ouro, habilidades com cooldown,
  minimapa, barra do chefe, avisos e cartão de loot.
- **Áudio sintetizado** (WebAudio): SFX e trilha ambiente, sem arquivos externos.
- **Save automático** (localStorage) com opção de continuar.

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
  core/               pixel, rng, input, áudio, câmera, partículas
  data/               classes, itens, inimigos, NPCs, missões
  world/              tiles, mapa (acesso/colisão/desenho), geração de mundos
  game/               game, player, enemy, npc, projectile, abilities, combat
  ui/                 hud (canvas) + panels (DOM)
tests/                harness DOM/canvas, suíte, rasterizador, gerador de PNGs
```
