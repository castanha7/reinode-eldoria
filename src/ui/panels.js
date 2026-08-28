// ---------------------------------------------------------------------------
// panels.js — interface em DOM: diálogos, inventário, loja, missões, menus
// ---------------------------------------------------------------------------
import { CLASSES, CLASS_IDS } from '../data/classes.js';
import { QUESTS, questById } from '../data/quests.js';
import { STAT_INFO, SLOT_INFO, RARITY, describeStats, shopStock, consumable, CONSUMABLES } from '../data/items.js';
import { sfx } from '../core/audio.js';
import { S } from '../sprites.js';

const $ = (sel) => document.querySelector(sel);

export class UI {
  constructor() {
    this.game = null;
    this.blocking = false;
    this.dialogState = null;
    this.guard = 0;
    this.shopItems = [];
    this.selected = null;
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
    const hasSave = (() => { try { return !!localStorage.getItem('eldoria_save_v1'); } catch (e) { return false; } })();
    const bc = $('#btn-continue');
    if (bc) bc.classList.toggle('hidden', !hasSave);
    $('#btn-wipe')?.addEventListener('click', () => {
      this.game.wipeSave();
      $('#btn-continue')?.classList.add('hidden');
    });
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
        this.game.startRun(id);
        this.hideTitle();
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
        const c = consumable(node.dataset.id);
        if (g.player.gold < c.price) { g.notify('Ouro insuficiente.', '#ff8a8a'); sfx('deny'); break; }
        if (!g.player.addItem(c)) { g.notify('Inventário cheio!', '#ff8a8a'); sfx('deny'); break; }
        g.player.gold -= c.price;
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
      case 'quest-accept': {
        const q = questById(node.dataset.id);
        if (!q) break;
        g.quests[q.id].state = 'active';
        g.notify(`Missão aceita: ${q.name}`, '#ffd85a');
        sfx('quest');
        this.closeAll();
        g.save();
        break;
      }
      case 'quest-turn': {
        const q = questById(node.dataset.id);
        if (!q) break;
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
      case 'restart':
        this.game.wipeSave();
        location.reload();
        break;
      default:
        break;
    }
  }

  // =========================================================================
  // painéis
  // =========================================================================
  anyPanelOpen() {
    return ['dialog', 'inventory', 'shop', 'quests', 'pause', 'help'].some((k) => !this.el[k].classList.contains('hidden'));
  }

  updateBlocking() {
    this.blocking = this.anyPanelOpen();
  }

  closeAll() {
    for (const k of ['dialog', 'inventory', 'shop', 'quests', 'pause', 'help']) this.el[k].classList.add('hidden');
    this.dialogState = null;
    this.updateBlocking();
  }

  togglePanel(name) {
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
    const choices = [];
    let lines = [];
    for (const q of QUESTS) {
      const st = g.quests[q.id];
      if (!st) continue;
      if (st.state === 'done') {
        lines = lines.concat(q.done || ['Missão cumprida.']);
        choices.push({ act: 'quest-turn', id: q.id, label: `Entregar: ${q.name}` });
      }
    }
    if (!choices.length) {
      // próxima missão disponível
      const next = QUESTS.find((q) => {
        const st = g.quests[q.id];
        if (!st) return false;
        if (st.state !== 'available') return false;
        if (q.order === 1) return true;
        const prev = QUESTS.find((x) => x.order === q.order - 1);
        return prev && g.quests[prev.id] && g.quests[prev.id].state === 'complete';
      });
      if (next) {
        lines = next.dialog.slice();
        lines.push(`Objetivo: ${next.hint}`);
        lines.push(`Recompensa: ${next.reward.gold} ouro, ${next.reward.xp} XP e um item ${RARITY[next.reward.item] ? RARITY[next.reward.item].name.toLowerCase() : ''}.`);
        choices.push({ act: 'quest-accept', id: next.id, label: `Aceitar: ${next.name}` });
      } else {
        lines = [
          'Você já fez por Eldoria mais do que qualquer exército meu faria.',
          'Descanse, herói. O reino respira por sua causa.',
          'Se quiser mais ouro, o mercante compra o que você carrega. E os baús ainda estão por aí.',
        ];
      }
    }
    choices.push({ act: 'close', label: 'Encerrar conversa' });
    this.showDialog({ name: npc.def.name, title: npc.def.title, sprite: npc.def.sprite, lines, choices });
  }

  renderQuests() {
    const g = this.game;
    const box = $('#quest-list');
    if (!box) return;
    box.innerHTML = QUESTS.map((q) => {
      const st = g.quests[q.id] || { state: 'available', progress: 0 };
      const cls = st.state;
      const label = { available: 'Disponível', active: 'Em andamento', done: 'Concluída — falar com o Rei', complete: 'Completa' }[st.state] || '';
      const prog = q.goal.type === 'kill' ? `${Math.min(st.progress, q.goal.count)}/${q.goal.count}` : '';
      return `<div class="quest ${cls}">
        <div class="q-head"><b>${q.name}</b><span class="q-state">${label}</span></div>
        <p>${q.text}</p>
        <div class="q-foot"><span>▸ ${q.hint} ${prog ? `<b class="q-prog">${prog}</b>` : ''}</span>
        <span class="q-reward">${q.reward.gold} ouro · ${q.reward.xp} XP</span></div>
      </div>`;
    }).join('');
  }

  renderHelp() {
    const box = $('#help-body');
    if (!box) return;
    box.innerHTML = `
      <h4>Controles</h4>
      <table>
        <tr><td>WASD / Setas</td><td>Mover</td></tr>
        <tr><td>Mouse</td><td>Mirar</td></tr>
        <tr><td>Clique esquerdo</td><td>Atacar (segure para repetir)</td></tr>
        <tr><td>1 / 2 / 3</td><td>Habilidades da classe</td></tr>
        <tr><td>E</td><td>Interagir (NPC, baú, portal)</td></tr>
        <tr><td>R</td><td>Beber poção de vida</td></tr>
        <tr><td>I</td><td>Inventário e equipamentos</td></tr>
        <tr><td>Q</td><td>Diário de missões</td></tr>
        <tr><td>ESC</td><td>Menu / fechar painel</td></tr>
      </table>
      <h4>Dicas</h4>
      <ul>
        <li>Fale com o <b>Rei Aldric</b> no castelo ao norte da cidade para receber missões.</li>
        <li>Baús dão equipamentos <b>da sua classe</b>: quanto mais perigosa a área, melhor o item.</li>
        <li>Procure círculos de pedra — três áreas secretas guardam tesouros raros.</li>
        <li>O <b>ferreiro</b> reforja sua arma permanentemente; o <b>mercante</b> compra seus itens.</li>
        <li>A <b>Caverna Esquecida</b> fica ao norte, seguindo a estrada. O chefe espera no fundo.</li>
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
    if (this.shopMode === 'smith') {
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
          ${CONSUMABLES.map((c) => potionRow(c, p.gold)).join('')}
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
          ${CONSUMABLES.map((c) => potionRow(c, p.gold)).join('')}
        </div>`;
    } else {
      html = `<div class="shop-section"><h4>À venda <span class="muted">(${this.game.player.cls.name})</span></h4>
        ${this.shopItems.length ? this.shopItems.map((it, i) => `
          <div class="shop-row">
            ${itemCard(it, true)}
            <button class="btn" data-act="buy" data-idx="${i}" ${p.gold < it.price ? 'disabled' : ''}>${it.price} ouro</button>
          </div>`).join('') : '<p class="muted">Esgotado por hoje.</p>'}
      </div>
      <div class="shop-section"><h4>Poções</h4>${CONSUMABLES.map((c) => potionRow(c, p.gold)).join('')}</div>`;
    }
    if (this.shopMode !== 'smith') {
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
      <div class="loot-head" style="color:${r.color}">${source || 'Novo item'}</div>
      <div class="loot-name" style="color:${r.color}">${item.name}</div>
      <div class="loot-sub">${SLOT_INFO[item.slot] ? SLOT_INFO[item.slot].name : 'Consumível'} · ${r.name}</div>
      <div class="loot-stats">${describeStats(item.stats || {}).map((s) => `<div>${s}</div>`).join('')}</div>
      ${item.desc ? `<div class="loot-desc">${item.desc}</div>` : ''}`;
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
    $('#death-stats').innerHTML = `
      <div>Nível alcançado: <b>${g.player.level}</b></div>
      <div>Inimigos derrotados: <b>${g.player.kills}</b></div>
      <div>Baús abertos: <b>${g.player.chestsOpened}</b></div>
      <div>Você perderá <b>${Math.round(g.player.gold * 0.15)}</b> de ouro.</div>`;
    this.el.death.classList.remove('hidden');
  }
  hideDeath() { this.el.death.classList.add('hidden'); }

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
  return `<div class="item ${it.rarity || 'common'} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}" ${it.uid ? `data-uid="${it.uid}"` : ''}>
    <div class="i-top"><span class="i-icon">${slot.icon}</span><span class="i-name" style="color:${r.color}">${it.name}</span></div>
    <div class="i-sub">${slot.name} · ${r.name}${it.price ? ` · ${it.price} ouro` : ''}</div>
    ${stats.length ? `<div class="i-stats">${stats.map((s) => `<div>${s}</div>`).join('')}</div>` : ''}
    ${it.desc ? `<div class="i-desc">${it.desc}</div>` : ''}
  </div>`;
}
