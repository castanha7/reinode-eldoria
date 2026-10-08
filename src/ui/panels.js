// ---------------------------------------------------------------------------
// panels.js — interface em DOM: diálogos, inventário, loja, missões, menus
// ---------------------------------------------------------------------------
import { CLASSES, CLASS_IDS } from '../data/classes.js';
import { QUESTS, questById, questUnlocked } from '../data/quests.js';
import { MODES, MODE_IDS, modeById, MAX_LIVES } from '../data/modes.js';
import { STAT_INFO, SLOT_INFO, RARITY, describeStats, shopStock, consumable, CONSUMABLES } from '../data/items.js';
import { sfx } from '../core/audio.js';
import { Input } from '../core/input.js';
import { S } from '../sprites.js';

const $ = (sel) => document.querySelector(sel);
const PANELS = ['dialog', 'inventory', 'shop', 'quests', 'pause', 'help', 'victory'];

/** Poções/itens à venda em cada tipo de loja. */
const SHOP_LISTS = {
  shop: ['potion_hp', 'potion_hp_big', 'potion_mana', 'ration', 'scroll_return'],
  healer: ['potion_hp', 'potion_hp_big', 'potion_mana', 'ration'],
  smith: ['potion_hp', 'potion_mana'],
};

/** Canções do bardo (buffs pagos). */
const SONGS = [
  { id: 'song_valor', name: 'Canção do Valente', price: 80, desc: '+25% de dano por 90s.', color: '#ff8a5a', mods: { atk: 0.25 }, flat: {}, time: 90 },
  { id: 'song_stone', name: 'Balada da Pedra', price: 80, desc: '+30% de defesa e +15% de vida máxima por 90s.', color: '#9ab0c8', mods: { def: 0.3, hp: 0.15 }, flat: {}, time: 90 },
  { id: 'song_wind', name: 'Cantiga do Vento', price: 95, desc: '+20% de velocidade e +10% de esquiva por 90s.', color: '#8ae8ff', mods: { speed: 0.2 }, flat: { dodge: 0.1 }, time: 90 },
];

export class UI {
  constructor() {
    this.game = null;
    this.blocking = false;
    this.dialogState = null;
    this.guard = 0;
    this.shopItems = [];
    this.shopMode = 'shop';
    this.selected = null;
    this.selMode = 'normal';
    this.el = {
      toasts: $('#toasts'),
      loot: $('#loot-card'),
      dialog: $('#dialog'),
      inventory: $('#inventory'),
      shop: $('#shop'),
      quests: $('#quests'),
      help: $('#help'),
      death: $('#death'),
      pause: $('#pause'),
      title: $('#title'),
      victory: $('#victory'),
      mapname: $('#mapname'),
    };
    this.buildTitle();
    this.bind();
  }

  setGame(g) { this.game = g; }

  bind() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-act]')) this.onAction(t.closest('[data-act]'));
    });
    document.addEventListener('keydown', (e) => {
      if (this.guard > 0) return;
      if (e.code === 'Escape') {
        if (this.anyPanelOpen()) { this.closeAll(); e.preventDefault(); }
        else if (this.game && this.game.state === 'playing') this.togglePause();
      }
    });
  }

  // =========================================================================
  // título / seleção de classe
  // =========================================================================
  buildTitle() {
    const wrap = $('#class-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (const id of CLASS_IDS) {
      const c = CLASSES[id];
      const card = document.createElement('div');
      card.className = 'class-card';
      card.dataset.cls = id;
      card.innerHTML = `
        <div class="cc-icon"><canvas width="24" height="26" data-icon="${id}"></canvas></div>
        <div class="cc-body">
          <h3 style="color:${c.color}">${c.name}</h3>
          <p class="cc-tag">${c.tagline}</p>
          <p class="cc-desc">${c.desc}</p>
          <div class="cc-stats">
            <span>Vida <b>${c.stats.hp}</b></span>
            <span>Dano <b>${c.stats.atk}</b></span>
            <span>Defesa <b>${c.stats.def}</b></span>
            <span>Veloc. <b>${c.stats.speed}</b></span>
            <span>Alcance <b>${c.stats.range}</b></span>
          </div>
          <div class="cc-skills">
            ${c.skills.map((s, i) => `<span class="sk"><i>${i + 1}</i>${s.name}</span>`).join('')}
          </div>
        </div>`;
      card.addEventListener('click', () => {
        this.selectClass(id);
      });
      wrap.appendChild(card);
    }
    this.paintIcons(wrap);
    this.buildModes();
    let save = null;
    try { save = JSON.parse(localStorage.getItem('eldoria_save_v1')); } catch (e) { save = null; }
    const bc = $('#btn-continue');
    if (bc) {
      bc.classList.toggle('hidden', !save);
      if (save) {
        const M = modeById(save.mode);
        const cname = CLASSES[save.cls] ? CLASSES[save.cls].name : '';
        bc.textContent = `Continuar: ${cname} nv ${save.level} · ${M.name}${M.lives !== Infinity && save.lives ? ` · ${'❤'.repeat(save.lives)}` : ''}`;
      }
    }
    const wipe = $('#btn-wipe');
    if (wipe && !wipe.dataset.bound) {
      wipe.dataset.bound = '1';
      wipe.addEventListener('click', () => {
        this.game.wipeSave();
        $('#btn-continue')?.classList.add('hidden');
      });
    }
    this.renderTrophies();
  }

  buildModes() {
    const wrap = $('#mode-list');
    if (!wrap) return;
    wrap.innerHTML = MODE_IDS.map((id) => {
      const M = MODES[id];
      return `<div class="mode-card ${id === this.selMode ? 'sel' : ''}" data-mode="${id}" style="--mc:${M.color}">
        <div class="mc-head"><span class="mc-icon">${M.icon}</span><b>${M.name}</b><span class="mc-lives">${M.lives === Infinity ? '∞' : '❤'.repeat(M.lives)}</span></div>
        <p>${M.desc}</p>
      </div>`;
    }).join('');
    wrap.querySelectorAll('.mode-card').forEach((n) => n.addEventListener('click', () => {
      this.selMode = n.dataset.mode;
      sfx('ui');
      wrap.querySelectorAll('.mode-card').forEach((c) => c.classList.toggle('sel', c === n));
    }));
  }

  renderTrophies() {
    const box = $('#trophies');
    if (!box) return;
    let t = {};
    try { t = JSON.parse(localStorage.getItem('eldoria_trophies') || '{}'); } catch (e) { t = {}; }
    const parts = MODE_IDS.filter((id) => t.clears && t.clears[id]).map((id) => {
      const bt = t.bestTime && t.bestTime[id];
      const mm = bt ? ` · melhor ${Math.floor(bt / 60)}min` : '';
      return `<span class="trophy" style="color:${MODES[id].color}">🏆 ${MODES[id].name} ×${t.clears[id]}${mm}</span>`;
    });
    box.innerHTML = parts.length ? parts.join('') : '';
  }

  paintIcons(root) {
    for (const cv of root.querySelectorAll('canvas[data-icon]')) {
      const spr = S(`heroicon:${cv.dataset.icon}`);
      if (!spr) continue;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(spr, (cv.width - 22) / 2, (cv.height - 22) / 2, 22, 22);
    }
  }

  selectClass(id) {
    sfx('ui');
    document.querySelectorAll('.class-card').forEach((c) => c.classList.toggle('sel', c.dataset.cls === id));
    $('#btn-start').dataset.cls = id;
    $('#btn-start').classList.remove('disabled');
  }

  onAction(node) {
    if (node.disabled || node.classList.contains('disabled')) return;
    const act = node.dataset.act;
    const g = this.game;
    switch (act) {
      case 'start': {
        const id = node.dataset.cls || 'mage';
        this.startGame(id);
        break;
      }
      case 'continue':
        if (this.game.loadSave()) this.hideTitle();
        break;
      case 'dialog-next':
        this.advanceDialog();
        break;
      case 'close':
        this.closeAll();
        break;
      case 'resume':
        this.togglePause();
        break;
      case 'inv-equip':
        if (this.selected) { g.player.equipItem(this.selected); this.renderInventory(); g.save(); }
        break;
      case 'inv-use':
        if (this.selected) { g.player.useItem(this.selected, g); this.renderInventory(); g.save(); }
        break;
      case 'inv-drop':
        if (this.selected) { g.player.removeItem(this.selected); this.selected = null; this.renderInventory(); g.save(); }
        break;
      case 'buy': {
        const idx = +node.dataset.idx;
        const it = this.shopItems[idx];
        if (!it) break;
        if (g.player.gold < it.price) { g.notify('Ouro insuficiente.', '#ff8a8a'); sfx('deny'); break; }
        if (!g.player.addItem(it)) { g.notify('Inventário cheio!', '#ff8a8a'); sfx('deny'); break; }
        g.player.gold -= it.price;
        g.notify(`Comprou ${it.name}`, '#7ae88a');
        sfx('coin');
        this.shopItems.splice(idx, 1);
        this.renderShop();
        g.save();
        break;
      }
      case 'buy-potion': {
        if (!CONSUMABLES.some((x) => x.id === node.dataset.id)) break;
        const c = consumable(node.dataset.id);
        if (g.player.gold < c.price) { g.notify('Ouro insuficiente.', '#ff8a8a'); sfx('deny'); break; }
        if (!g.player.addItem(c)) { g.notify('Inventário cheio!', '#ff8a8a'); sfx('deny'); break; }
        g.player.gold -= c.price;
        g.notify(`Comprou ${c.name}`, '#7ae88a');
        sfx('coin');
        this.renderShop();
        g.save();
        break;
      }
      case 'sell': {
        const it = g.player.inventory.find((x) => x.uid === node.dataset.uid);
        if (!it) break;
        const price = Math.max(1, Math.round((it.price || 10) * 0.5));
        g.player.removeItem(it.uid);
        g.player.gold += price;
        g.notify(`Vendeu ${it.name} por ${price} ouro`, '#ffd85a');
        sfx('coin');
        if (this.selected === it.uid) this.selected = null;
        this.renderShop();
        this.renderInventory();
        g.save();
        break;
      }
      case 'heal': {
        const cost = Math.max(5, Math.round((g.player.maxHp - g.player.hp) * 0.5));
        if (g.player.gold < cost) { g.notify('Ouro insuficiente.', '#ff8a8a'); sfx('deny'); break; }
        g.player.gold -= cost;
        g.player.hp = g.player.maxHp;
        g.player.mana = g.player.maxMana;
        g.notify('Feridas fechadas. Vá com cuidado.', '#7ae88a');
        sfx('heal');
        this.closeAll();
        g.save();
        break;
      }
      case 'forge': {
        const cost = Math.round(140 * Math.pow(g.player.weaponUpgrades + 1, 1.65));
        if (g.player.gold < cost) { g.notify('Ouro insuficiente.', '#ff8a8a'); sfx('deny'); break; }
        g.player.gold -= cost;
        g.player.weaponUpgrades++;
        g.player.recompute();
        g.notify(`Arma reforjada! Nível ${g.player.weaponUpgrades} (+${g.player.weaponUpgrades * 8}% dano)`, '#ffd85a');
        sfx('levelup');
        this.closeAll();
        g.save();
        break;
      }
      case 'bard-buy': {
        const song = SONGS.find((x) => x.id === node.dataset.id);
        if (!song) break;
        const price = this.songPrice(song);
        if (g.player.gold < price) { g.notify('Ouro insuficiente.', '#ff8a8a'); sfx('deny'); break; }
        g.player.gold -= price;
        g.player.addBuff(g, { id: song.id, name: song.name, time: song.time, mods: song.mods, flat: song.flat, color: song.color });
        g.notify(`${song.name}: ${song.desc}`, song.color);
        sfx('levelup');
        this.renderShop();
        g.save();
        break;
      }
      case 'save-quit':
        g.save();
        this.closeAll();
        this.el.victory.classList.add('hidden');
        g.toTitle();
        break;
      case 'victory-continue':
        this.el.victory.classList.add('hidden');
        this.updateBlocking();
        break;
      case 'to-title':
        g.toTitle();
        break;
      case 'quest-accept': {
        const q = questById(node.dataset.id);
        if (!q) break;
        if (!questUnlocked(q, g.quests)) { g.notify('Essa missão ainda não está disponível.', '#c96a6a'); break; }
        g.quests[q.id].state = 'active';
        g.notify(`Missão aceita: ${q.name}`, '#ffd85a');
        sfx('quest');
        this.closeAll();
        g.save();
        break;
      }
      case 'quest-turn': {
        const q = questById(node.dataset.id);
        if (!q || g.quests[q.id].state !== 'done') break;
        g.quests[q.id].state = 'complete';
        g.giveQuestRewards(q);
        this.closeAll();
        g.save();
        break;
      }
      case 'respawn':
        this.game.respawnPlayer();
        break;
      case 'tab-inv': this.togglePanel('inventory'); break;
      case 'tab-quests': this.togglePanel('quests'); break;
      case 'tab-help': this.togglePanel('help'); break;
      case 'restart': {
        // confirmação em dois cliques: abandonar apaga o progresso salvo
        if (!this.confirmRestart) {
          this.confirmRestart = true;
          node.textContent = 'Clique de novo para apagar o progresso';
          setTimeout(() => { this.confirmRestart = false; node.textContent = 'Abandonar partida'; }, 3500);
          break;
        }
        this.confirmRestart = false;
        node.textContent = 'Abandonar partida';
        this.game.wipeSave();
        this.game.toTitle();
        break;
      }
      default:
        break;
    }
  }

  // =========================================================================
  // painéis
  // =========================================================================
  startGame(id) {
    this.shopItems = [];
    this.selected = null;
    this.game.startRun(id, this.selMode);
    this.hideTitle();
  }

  anyPanelOpen() {
    return PANELS.some((k) => this.el[k] && !this.el[k].classList.contains('hidden'));
  }

  updateBlocking() {
    this.blocking = this.anyPanelOpen();
  }

  closeAll() {
    for (const k of PANELS) if (this.el[k]) this.el[k].classList.add('hidden');
    this.dialogState = null;
    this.updateBlocking();
  }

  togglePanel(name) {
    if (this.game && this.game.state !== 'playing') return;
    const wasOpen = !this.el[name].classList.contains('hidden');
    this.closeAll();
    if (wasOpen) return;
    this.el[name].classList.remove('hidden');
    if (name === 'inventory') this.renderInventory();
    if (name === 'quests') this.renderQuests();
    if (name === 'help') this.renderHelp();
    sfx('ui');
    this.updateBlocking();
  }

  togglePause() {
    this.togglePanel('pause');
  }

  setMapName(n) {
    if (this.el.mapname) this.el.mapname.textContent = n;
  }

  // =========================================================================
  // diálogos
  // =========================================================================
  openNpc(npc) {
    const def = npc.def;
    let lines = def.dialog.slice();
    npc.talked = true;
    const after = () => {
      switch (def.role) {
        case 'shop': this.openShop(npc); break;
        case 'healer': this.openHealer(npc); break;
        case 'smith': this.openSmith(npc); break;
        case 'quest': this.openKing(npc); break;
        case 'alchemist': this.openAlchemist(npc); break;
        case 'bard': this.openBard(npc); break;
        default: this.closeAll(); break;
      }
    };
    this.showDialog({ name: def.name, title: def.title, sprite: def.sprite, lines, onEnd: after });
  }

  showDialog({ name, title, sprite, lines, onEnd, choices }) {
    this.closeAll();
    this.dialogState = { name, title, sprite, lines: lines.slice(), i: 0, onEnd, choices };
    this.el.dialog.classList.remove('hidden');
    this.renderDialog();
    this.guard = 0.25;
    setTimeout(() => { this.guard = 0; }, 260);
    this.updateBlocking();
  }

  renderDialog() {
    const d = this.dialogState;
    if (!d) return;
    const last = d.i >= d.lines.length - 1;
    this.el.dialog.innerHTML = `
      <div class="dlg-portrait"><canvas width="24" height="26"></canvas></div>
      <div class="dlg-body">
        <div class="dlg-head"><b>${d.name}</b><span>${d.title || ''}</span></div>
        <p class="dlg-text">${d.lines[Math.min(d.i, d.lines.length - 1)]}</p>
        <div class="dlg-foot">
          ${last
            ? (d.choices ? d.choices.map((c) => `<button class="btn" data-act="${c.act}" data-id="${c.id || ''}">${c.label}</button>`).join('')
              : `<button class="btn ghost" data-act="dialog-next">Fechar</button>`)
            : `<span class="dlg-hint">Espaço / clique para continuar</span><button class="btn" data-act="dialog-next">Continuar ▶</button>`}
        </div>
      </div>`;
    const cv = this.el.dialog.querySelector('canvas');
    const spr = S(`npc:${d.sprite}:0:0`);
    if (cv && spr) {
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(spr, 1, 2, 22, 22);
    }
  }

  advanceDialog() {
    const d = this.dialogState;
    if (!d) return;
    if (d.i < d.lines.length - 1) {
      d.i++;
      sfx('ui');
      this.renderDialog();
    } else if (d.onEnd) {
      const f = d.onEnd;
      this.dialogState = null;
      this.el.dialog.classList.add('hidden');
      this.updateBlocking();
      f();
    } else {
      this.closeAll();
    }
  }

  // =========================================================================
  // rei / missões
  // =========================================================================
  openKing(npc) {
    const g = this.game;
    const own = npc.def.quests || QUESTS.filter((q) => (q.giver || 'king') === 'king').map((q) => q.id);
    const mine = own.map((id) => questById(id)).filter(Boolean);
    const choices = [];
    let lines = [];
    for (const q of mine) {
      const st = g.quests[q.id];
      if (st && st.state === 'done') {
        lines = lines.concat(q.done || ['Missão cumprida.']);
        choices.push({ act: 'quest-turn', id: q.id, label: `Entregar: ${q.name}` });
      }
    }
    if (!choices.length) {
      const next = mine.find((q) => {
        const st = g.quests[q.id];
        return st && st.state === 'available' && questUnlocked(q, g.quests);
      });
      const active = mine.filter((q) => g.quests[q.id] && g.quests[q.id].state === 'active');
      if (next) {
        lines = next.dialog.slice();
        lines.push(`Objetivo: ${next.hint}`);
        lines.push(`Recompensa: ${next.reward.gold} ouro, ${next.reward.xp} XP e um item ${RARITY[next.reward.item] ? RARITY[next.reward.item].name.toLowerCase() : ''}.`);
        choices.push({ act: 'quest-accept', id: next.id, label: `Aceitar: ${next.name}` });
      } else if (active.length) {
        const q = active[0];
        const st = g.quests[q.id];
        lines = [`Ainda não terminou "${q.name}"?`, `${q.hint} (${Math.min(st.progress, q.goal.count)}/${q.goal.count})`];
      } else if (npc.npcId === 'king' || (npc.def.title || '').includes('Rei')) {
        lines = [
          'Você já fez por Eldoria mais do que qualquer exército meu faria.',
          'Descanse, herói. O reino respira por sua causa.',
          'Se quiser mais ouro, o mercante compra o que você carrega. E os baús ainda estão por aí.',
        ];
        const pending = QUESTS.filter((q) => g.quests[q.id] && g.quests[q.id].state === 'available' && !questUnlocked(q, g.quests));
        if (pending.length) lines.push('Outras ameaças só surgirão quando as anteriores forem vencidas.');
      } else {
        lines = ['Por enquanto não tenho mais nada para você. Volte depois de ter vencido outras ameaças — eu aviso.'];
      }
    }
    choices.push({ act: 'close', label: 'Encerrar conversa' });
    this.showDialog({ name: npc.def.name, title: npc.def.title, sprite: npc.def.sprite, lines, choices });
  }

  renderQuests() {
    const g = this.game;
    const box = $('#quest-list');
    if (!box) return;
    const GIVERS = { king: 'o Rei Aldric', guard_east: 'o Capitão Dorn', hunter: 'a Caçadora Yara' };
    const order = { active: 0, done: 1, available: 2, complete: 3 };
    const list = QUESTS.slice().sort((a, b) => {
      const sa = g.quests[a.id] || { state: 'available' }, sb = g.quests[b.id] || { state: 'available' };
      const la = sa.state === 'available' && !questUnlocked(a, g.quests) ? 4 : order[sa.state];
      const lb = sb.state === 'available' && !questUnlocked(b, g.quests) ? 4 : order[sb.state];
      return la - lb || a.order - b.order;
    });
    box.innerHTML = list.map((q) => {
      const st = g.quests[q.id] || { state: 'available', progress: 0 };
      const locked = st.state === 'available' && !questUnlocked(q, g.quests);
      const cls = locked ? 'locked' : st.state;
      const gv = GIVERS[q.giver || 'king'] || 'o Rei';
      const label = locked ? 'Bloqueada' : { available: `Disponível — falar com ${gv}`, active: 'Em andamento', done: `Concluída — falar com ${gv}`, complete: 'Completa' }[st.state] || '';
      const prog = q.goal.type === 'kill' ? `${Math.min(st.progress, q.goal.count)}/${q.goal.count}` : '';
      return `<div class="quest ${cls}">
        <div class="q-head"><b>${q.name}</b><span class="q-state">${label}</span></div>
        <p>${locked ? 'Conclua as missões anteriores para liberar esta.' : q.text}</p>
        <div class="q-foot"><span>▸ ${locked ? '???' : q.hint} ${prog && !locked ? `<b class="q-prog">${prog}</b>` : ''}</span>
        <span class="q-reward">${q.reward.gold} ouro · ${q.reward.xp} XP</span></div>
      </div>`;
    }).join('');
  }

  renderHelp() {
    const box = $('#help-body');
    if (!box) return;
    const p = this.game && this.game.player;
    const nsk = p ? p.cls.skills.length : 4;
    box.innerHTML = `
      <h4>Controles (teclado e mouse)</h4>
      <table>
        <tr><td>WASD / Setas</td><td>Mover</td></tr>
        <tr><td>Mouse</td><td>Mirar</td></tr>
        <tr><td>Clique esquerdo</td><td>Atacar (segure para repetir)</td></tr>
        <tr><td>1 / 2 / 3 / 4 / 5</td><td>Habilidades da classe (a 4ª abre no nível 5; a 5ª, o golpe assinatura, no nível 8)</td></tr>
        <tr><td>Espaço</td><td>Rolamento de esquiva (invulnerável por instantes)</td></tr>
        <tr><td>E</td><td>Interagir (NPC, baú, portal)</td></tr>
        <tr><td>R</td><td>Beber poção de vida</td></tr>
        <tr><td>I / Q / H</td><td>Inventário / Missões / Ajuda</td></tr>
        <tr><td>M / N</td><td>Música / efeitos sonoros</td></tr>
        <tr><td>ESC</td><td>Menu / fechar painel</td></tr>
      </table>
      <h4>Celular</h4>
      <p class="muted">Joystick à esquerda move o herói. O botão ⚔ à direita ataca com mira automática (arraste-o para mirar manualmente). Botões ao redor: ${nsk} habilidades, esquiva, interagir, poção, inventário e menu.</p>
      <h4>Modos de jogo</h4>
      <ul>
        <li><b>Aventura</b>: sem limite de mortes; você perde um pouco de ouro.</li>
        <li><b>Clássico</b>: 3 vidas para zerar o jogo. Sem vidas, o progresso é apagado. A <b>Pena da Fênix</b> dá +1 vida (máx. ${MAX_LIVES}).</li>
        <li><b>Hardcore</b>: uma única vida, inimigos mais fortes e pouca regeneração.</li>
      </ul>
      <h4>Dicas</h4>
      <ul>
        <li>Fale com o <b>Rei Aldric</b> no castelo ao norte da cidade. <b>Capitão Dorn</b> (estrada leste) e a <b>Caçadora Yara</b> (floresta) também dão missões.</li>
        <li>Conclua a história principal entregando a missão do Guardião ao Rei para <b>zerar o jogo</b>. Os cinco chefes do mundo (Vyrka, Maldrak, Grommash, Skalla e Ashkaru) são desafios opcionais com tesouros à altura.</li>
        <li>Todo inimigo pode soltar equipamento — comum, raro, épico, lendário ou <b style="color:#ff5470">mítico ✵</b>. Nunca se sabe o que vem de cada mob: é sorte, não lista.</li>
        <li>Baús dão equipamentos <b>da sua classe</b>; com a mochila cheia o baú não abre.</li>
        <li>O rio só se atravessa pelas pontes. Procure círculos de pedra — três áreas secretas guardam tesouros.</li>
        <li>Chefes têm fases: ao perder vida eles ficam mais perigosos. Use a esquiva nos golpes marcados em vermelho.</li>
        <li>O <b>ferreiro</b> reforja sua arma; a <b>alquimista</b> vende elixires; o <b>bardo</b> vende bônus temporários.</li>
        <li>Bandidos roubam ouro — derrote-os para recuperá-lo.</li>
      </ul>`;
  }

  // =========================================================================
  // inventário
  // =========================================================================
  renderInventory() {
    const g = this.game;
    if (!g || !g.player) return;
    const p = g.player;
    const slots = $('#equip-slots');
    slots.innerHTML = ['weapon', 'armor', 'trinket'].map((slot) => {
      const it = p.equip[slot];
      return `<div class="slot">
        <div class="slot-label">${SLOT_INFO[slot].icon} ${SLOT_INFO[slot].name}</div>
        ${it ? itemCard(it, true) : `<div class="item empty">— vazio —</div>`}
      </div>`;
    }).join('');

    const bag = $('#bag-grid');
    bag.innerHTML = p.inventory.length
      ? p.inventory.map((it) => itemCard(it, false, it.uid === this.selected)).join('')
      : '<div class="bag-empty">Nenhum item. Abra baús e derrote inimigos!</div>';
    $('#bag-count').textContent = `(${p.inventory.length}/26)`;
    bag.querySelectorAll('.item[data-uid]').forEach((n) => {
      n.addEventListener('click', () => {
        this.selected = n.dataset.uid;
        sfx('ui');
        this.renderInventory();
      });
    });

    const sel = p.inventory.find((i) => i.uid === this.selected);
    const actions = $('#bag-actions');
    if (sel) {
      const usable = sel.kind === 'consumable';
      const equippable = !!sel.slot;
      const wrong = equippable && sel.cls !== p.cls.id;
      actions.innerHTML = `
        <div class="sel-info">${describeStats(sel.stats || {}).join(' · ') || sel.desc || ''}</div>
        <div class="sel-btns">
          ${equippable ? `<button class="btn" data-act="inv-equip" ${wrong ? 'disabled title="Classe errada"' : ''}>Equipar</button>` : ''}
          ${usable ? `<button class="btn" data-act="inv-use">Usar</button>` : ''}
          <button class="btn danger" data-act="inv-drop">Descartar</button>
        </div>`;
    } else {
      actions.innerHTML = '<div class="sel-info ghost">Selecione um item da mochila.</div>';
    }

    const s = p.stats;
    $('#stat-list').innerHTML = [
      ['Vida', `${Math.ceil(p.hp)} / ${s.hp}`],
      [p.cls.resource, `${Math.floor(p.mana)} / ${s.mana}`],
      ['Dano', s.atk.toFixed(1)],
      ['Defesa', s.def.toFixed(1)],
      ['Velocidade', Math.round(s.speed)],
      ['Alcance', Math.round(s.range)],
      ['Vel. de Ataque', s.atkSpeed.toFixed(2) + '/s'],
      ['Crítico', Math.round(s.crit * 100) + '%'],
      ['Dano Crítico', Math.round(s.critDmg * 100) + '%'],
      ['Red. Cooldown', Math.round(s.cdRed * 100) + '%'],
      ['Regeneração', s.manaRegen.toFixed(1) + '/s'],
      ['Roubo de Vida', Math.round(s.lifesteal * 100) + '%'],
      ['Esquiva', Math.round(s.dodge * 100) + '%'],
      ['Regen. de Vida', (s.hpRegen || 0).toFixed(1) + '/s'],
      ['Ouro Extra', Math.round((s.goldFind || 0) * 100) + '%'],
      ...(p.maxLives ? [['Vidas', `${p.lives} / ${MAX_LIVES}`]] : []),
      ['Nível', p.level + '  (XP ' + p.xp + '/' + p.xpNeed + ')'],
      ['Arma reforjada', 'Nv ' + p.weaponUpgrades],
      ['Abates', String(p.kills)],
      ['Baús abertos', String(p.chestsOpened)],
      ['Ouro', String(p.gold)],
    ].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
  }

  // =========================================================================
  // loja / curandeira / ferreiro
  // =========================================================================
  openAlchemist(npc) {
    this.el.shop.classList.remove('hidden');
    $('#shop-title').textContent = `${npc.def.name} — Alquimia`;
    this.shopMode = 'alchemist';
    this.shopItems = [];
    this.renderShop();
    this.updateBlocking();
  }

  openBard(npc) {
    this.el.shop.classList.remove('hidden');
    $('#shop-title').textContent = `${npc.def.name} — Canções`;
    this.shopMode = 'bard';
    this.shopItems = [];
    this.renderShop();
    this.updateBlocking();
  }

  songPrice(song) {
    return Math.round(song.price * (1 + (this.game.player.level - 1) * 0.08));
  }

  /** Itens consumíveis oferecidos na loja atual (a Pena só existe no modo Clássico). */
  potionList() {
    const mode = this.game ? this.game.mode : 'normal';
    let ids;
    if (this.shopMode === 'alchemist') ids = CONSUMABLES.map((c) => c.id).filter((id) => id !== 'phoenix_feather' || mode === 'classic');
    else ids = SHOP_LISTS[this.shopMode] || SHOP_LISTS.shop;
    return ids.map((id) => CONSUMABLES.find((c) => c.id === id)).filter(Boolean);
  }

  openShop(npc) {
    if (!this.shopItems.length) {
      this.shopItems = shopStock(Math.random, this.game.player.cls.id);
    }
    this.el.shop.classList.remove('hidden');
    $('#shop-title').textContent = `${npc.def.name} — Comércio`;
    this.shopMode = 'shop';
    this.renderShop();
    this.updateBlocking();
  }

  openHealer(npc) {
    this.el.shop.classList.remove('hidden');
    $('#shop-title').textContent = `${npc.def.name} — Capela`;
    this.shopMode = 'healer';
    this.shopItems = [];
    this.renderShop();
    this.updateBlocking();
  }

  openSmith(npc) {
    this.el.shop.classList.remove('hidden');
    $('#shop-title').textContent = `${npc.def.name} — Forja`;
    this.shopMode = 'smith';
    this.shopItems = [];
    this.renderShop();
    this.updateBlocking();
  }

  renderShop() {
    const g = this.game;
    const p = g.player;
    const body = $('#shop-body');
    let html = '';
    if (this.shopMode === 'alchemist') {
      html = `<div class="shop-section"><h4>Elixires, poções e pergaminhos</h4>
        <p class="muted">Elixires de reforço duram de 25 a 35 segundos — beba antes dos chefes.</p>
        ${this.potionList().map((c) => potionRow(c, p.gold)).join('')}</div>`;
    } else if (this.shopMode === 'bard') {
      html = `<div class="shop-section"><h4>Canções de coragem</h4>
        <p class="muted">Cada canção dura 90 segundos. Só vale uma de cada vez.</p>
        ${SONGS.map((sg) => `<div class="shop-row"><div><div class="i-name" style="color:${sg.color}">♪ ${sg.name}</div><div class="i-desc">${sg.desc}</div></div>
          <button class="btn" data-act="bard-buy" data-id="${sg.id}" ${p.gold < this.songPrice(sg) ? 'disabled' : ''}>${this.songPrice(sg)} ouro</button></div>`).join('')}
      </div>`;
    } else if (this.shopMode === 'smith') {
      const cost = Math.round(140 * Math.pow(p.weaponUpgrades + 1, 1.65));
      html = `
        <div class="shop-section">
          <h4>Reforjar arma</h4>
          <p class="muted">Cada reforjo aumenta <b>+8% de dano</b> e <b>+4% de alcance</b>, permanentemente.</p>
          <div class="shop-row">
            <div>
              <div class="i-name rare">Reforço nível ${p.weaponUpgrades + 1}</div>
              <div class="i-desc">Dano e alcance da sua arma ${p.cls.weaponName.toLowerCase()}.</div>
            </div>
            <button class="btn" data-act="forge" ${p.gold < cost ? 'disabled' : ''}>${cost} ouro</button>
          </div>
        </div>
        <div class="shop-section">
          <h4>Poções</h4>
          ${this.potionList().map((c) => potionRow(c, p.gold)).join('')}
        </div>`;
    } else if (this.shopMode === 'healer') {
      const cost = Math.max(5, Math.round((p.maxHp - p.hp) * 0.5));
      html = `
        <div class="shop-section">
          <h4>Serviços sagrados</h4>
          <div class="shop-row">
            <div>
              <div class="i-name rare">Cura completa</div>
              <div class="i-desc">Restaura toda a vida e ${p.cls.resource.toLowerCase()}. (${Math.ceil(p.hp)}/${p.maxHp} agora)</div>
            </div>
            <button class="btn" data-act="heal" ${p.gold < cost || p.hp >= p.maxHp ? 'disabled' : ''}>${p.hp >= p.maxHp ? 'Saudável' : cost + ' ouro'}</button>
          </div>
        </div>
        <div class="shop-section">
          <h4>Poções</h4>
          ${this.potionList().map((c) => potionRow(c, p.gold)).join('')}
        </div>`;
    } else {
      html = `<div class="shop-section"><h4>À venda <span class="muted">(${this.game.player.cls.name})</span></h4>
        ${this.shopItems.length ? this.shopItems.map((it, i) => `
          <div class="shop-row">
            ${itemCard(it, true)}
            <button class="btn" data-act="buy" data-idx="${i}" ${p.gold < it.price ? 'disabled' : ''}>${it.price} ouro</button>
          </div>`).join('') : '<p class="muted">Esgotado por hoje.</p>'}
      </div>
      <div class="shop-section"><h4>Poções</h4>${this.potionList().map((c) => potionRow(c, p.gold)).join('')}</div>`;
    }
    if (this.shopMode !== 'smith' && this.shopMode !== 'bard') {
      html += `<div class="shop-section"><h4>Seus itens <span class="muted">(clique para vender por 50%)</span></h4>
        <div class="sell-grid">${p.inventory.map((it) => `
          <div class="sell-item" data-uid="${it.uid}" data-act="sell">
            <div class="i-name" style="color:${(RARITY[it.rarity] || { color: '#c9c9d4' }).color}">${it.name}</div>
            <div class="i-desc">${Math.max(1, Math.round((it.price || 10) * 0.5))} ouro</div>
          </div>`).join('') || '<p class="muted">Mochila vazia.</p>'}</div>
      </div>`;
    }
    body.innerHTML = html;
    $('#shop-gold').textContent = `${p.gold} ouro`;
  }

  // =========================================================================
  // diversos
  // =========================================================================
  pushToast(text, color) {
    const n = document.createElement('div');
    n.className = 'toast';
    n.style.borderLeftColor = color || '#c9c9d4';
    n.textContent = text;
    this.el.toasts.appendChild(n);
    setTimeout(() => n.classList.add('in'), 10);
    setTimeout(() => {
      n.classList.remove('in');
      setTimeout(() => n.remove(), 400);
    }, 3800);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
  }

  showLoot(item, source) {
    const r = RARITY[item.rarity] || RARITY.common;
    this.el.loot.innerHTML = `
      <div class="loot-head" style="color:${r.color}">${r.gem || ''} ${source || 'Novo item'}</div>
      <div class="loot-name" style="color:${r.color}">${item.name}</div>
      <div class="loot-sub">${SLOT_INFO[item.slot] ? SLOT_INFO[item.slot].name : 'Consumível'} · ${r.name}</div>
      <div class="loot-stats">${describeStats(item.stats || {}).map((s) => `<div>${s}</div>`).join('')}</div>
      ${item.desc ? `<div class="loot-desc">${item.desc}</div>` : ''}`;
    for (const rk of ['rare', 'epic', 'legendary', 'mythic']) this.el.loot.classList.toggle('loot-' + rk, item.rarity === rk);
    this.el.loot.classList.remove('hidden');
    this.el.loot.classList.add('show');
    sfx('chest');
    clearTimeout(this._lootT);
    this._lootT = setTimeout(() => {
      this.el.loot.classList.remove('show');
      setTimeout(() => this.el.loot.classList.add('hidden'), 400);
    }, 3600);
  }

  showDeath() {
    const g = this.game;
    const p = g.player;
    $('#death-title').textContent = 'Você caiu em batalha';
    $('#death-lives').innerHTML = p.maxLives
      ? `<div class="lives-row">${Array.from({ length: Math.max(p.maxLives, p.lives) }, (_, i) => `<span class="heart ${i < p.lives ? 'on' : 'off'}">${g.mode === 'hardcore' ? '☠' : '❤'}</span>`).join('')}</div>
         <div class="lives-note">${p.lives === 1 ? 'Última vida!' : `Vidas restantes: ${p.lives}`}</div>`
      : '';
    $('#death-stats').innerHTML = `
      <div>Nível alcançado: <b>${p.level}</b></div>
      <div>Inimigos derrotados: <b>${p.kills}</b></div>
      <div>Baús abertos: <b>${p.chestsOpened}</b></div>
      <div>A pena da morte: <b>${p.deathGoldLoss || 0}</b> de ouro (já descontada).</div>`;
    $('#death-actions').innerHTML = '<button class="btn big" data-act="respawn">Acordar na cidade</button><div class="lives-note">(Enter ou Espaço)</div>';
    this.el.death.classList.remove('hidden');
    this.deathMode = 'respawn';
  }

  showGameOver() {
    const g = this.game;
    const p = g.player;
    const M = modeById(g.mode);
    $('#death-title').textContent = g.mode === 'hardcore' ? 'Morte definitiva' : 'Fim de jogo';
    $('#death-lives').innerHTML = `<div class="lives-row">${Array.from({ length: M.lives }, () => '<span class="heart off">❤</span>').join('')}</div>
      <div class="lives-note">${g.mode === 'hardcore' ? 'Sua única vida acabou.' : 'Você ficou sem vidas.'} O progresso foi apagado.</div>`;
    const mins = Math.floor(g.stats.time / 60);
    $('#death-stats').innerHTML = `
      <div>Classe: <b>${p.cls.name}</b> · Modo: <b>${M.name}</b></div>
      <div>Nível alcançado: <b>${p.level}</b> · Tempo: <b>${mins} min</b></div>
      <div>Inimigos derrotados: <b>${p.kills}</b> · Baús: <b>${p.chestsOpened}</b></div>
      <div>Missões concluídas: <b>${Object.values(g.quests).filter((q) => q.state === 'complete').length}</b></div>`;
    $('#death-actions').innerHTML = '<button class="btn big" data-act="to-title">Voltar ao título</button>';
    this.el.death.classList.remove('hidden');
    this.deathMode = 'gameover';
  }

  canRespawn() {
    return this.deathMode === 'respawn' && !this.el.death.classList.contains('hidden');
  }

  showVictory(t) {
    const g = this.game;
    const p = g.player;
    const M = modeById(g.mode);
    const bosses = [['spider_queen', 'Vyrka, a Rainha Aranha'], ['lich', 'Maldrak, o Rei Esquelético'], ['titan', 'Grommash, o Colosso de Pedra'], ['skalla', 'Skalla, a Rainha do Inverno'], ['ashkaru', 'Ashkaru, o Arauto de Cinzas']];
    const keys = [...g.killedStatics];
    const bossLines = bosses.map(([id, nm]) => `<div class="${keys.some((k) => k.includes(`:${id}:`)) ? 'ok' : 'no'}">${keys.some((k) => k.includes(`:${id}:`)) ? '★' : '☆'} ${nm}</div>`).join('');
    const mins = Math.floor(g.stats.time / 60);
    $('#victory-body').innerHTML = `
      <p>O Guardião das Profundezas caiu e o reino respira em paz, <b>${p.cls.name}</b>.</p>
      <div class="v-stats">
        <div>Modo: <b style="color:${M.color}">${M.name}</b>${p.maxLives ? ` · Vidas restantes: <b>${p.lives}</b>` : ''}</div>
        <div>Nível <b>${p.level}</b> · <b>${p.kills}</b> inimigos · <b>${g.stats.deaths}</b> mortes · <b>${mins}</b> min</div>
      </div>
      <h4>Senhores das trevas (opcionais)</h4>
      <div class="v-bosses">${bossLines}</div>
      <p class="muted">Seu troféu foi guardado na tela de título. Você pode continuar explorando e enfrentar os demais chefes.</p>`;
    this.el.victory.classList.remove('hidden');
    this.updateBlocking();
  }
  hideDeath() { this.el.death.classList.add('hidden'); this.deathMode = null; }

  showTitle() { this.el.title.classList.remove('hidden'); }
  hideTitle() {
    this.el.title.classList.add('hidden');
    this.updateBlocking();
  }

  tick(dt) {
    if (this.guard > 0) this.guard = Math.max(0, this.guard - dt);
  }
}

function potionRow(c, gold) {
  return `<div class="shop-row">
    <div>
      <div class="i-name" style="color:${c.color}">${c.name}</div>
      <div class="i-desc">${c.desc}</div>
    </div>
    <button class="btn" data-act="buy-potion" data-id="${c.id}" ${gold < c.price ? 'disabled' : ''}>${c.price} ouro</button>
  </div>`;
}

export function itemCard(it, compact, selected) {
  const r = RARITY[it.rarity] || RARITY.common;
  const slot = it.slot ? SLOT_INFO[it.slot] : { name: 'Consumível', icon: '✚' };
  const stats = describeStats(it.stats || {});
  const rar = it.rarity || 'common';
  const chip = rar !== 'common'
    ? `<span class="i-rarity" style="color:${r.color};border-color:${r.color}">${r.gem || ''} ${r.name}</span>` : '';
  return `<div class="item ${rar} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}" style="--rc:${r.color}" ${it.uid ? `data-uid="${it.uid}"` : ''}>
    <div class="i-top"><span class="i-icon" style="color:${rar === 'common' ? '' : r.color}">${slot.icon}</span><span class="i-name" style="color:${r.color}">${it.name}</span>${chip}</div>
    <div class="i-sub">${slot.name}${it.price ? ` · ${it.price} ouro` : ''}</div>
    ${stats.length ? `<div class="i-stats">${stats.map((s) => `<div>${s}</div>`).join('')}</div>` : ''}
    ${it.desc ? `<div class="i-desc">${it.desc}</div>` : ''}
  </div>`;
}
