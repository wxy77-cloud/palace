(function () {
  'use strict';

  const page = 'achievements';
  let stars = [];
  let entries = [];
  let filteredEntries = [];
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const rarityRank = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    hidden: 5
  };

  const typeNames = {
    life: '生活',
    study: '学习',
    creative: '创作',
    social: '社交',
    health: '健康',
    game: '游戏',
    travel: '旅行',
    courage: '勇气',
    habit: '习惯',
    special: '特殊事件'
  };

  const rarityNames = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
    hidden: '隐藏'
  };

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDateValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTypeName(type) {
    return typeNames[type] || '特殊事件';
  }

  function getRarityName(rarity) {
    return rarityNames[rarity] || '普通';
  }

  function getEntryDate(entry) {
    return entry.achievedDate || entry.date || entry.createdAt || '';
  }

  function getFilters() {
    return {
      search: document.getElementById('achievement-search').value.trim().toLowerCase(),
      type: document.getElementById('achievement-filter-type').value,
      rarity: document.getElementById('achievement-filter-rarity').value,
      sort: document.getElementById('achievement-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = `${entry.title || ''} ${entry.content || ''}`.toLowerCase();
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.type && (entry.type || 'special') !== filters.type) return false;
      if (filters.rarity && (entry.rarity || 'common') !== filters.rarity) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (filters.sort === 'points-desc') return (parseInt(b.points, 10) || 0) - (parseInt(a.points, 10) || 0);
      if (filters.sort === 'rarity-desc') return (rarityRank[b.rarity || 'common'] || 1) - (rarityRank[a.rarity || 'common'] || 1);
      if (filters.sort === 'title-asc') return String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN');
      return String(getEntryDate(b)).localeCompare(String(getEntryDate(a)));
    });
  }

  function createStarElement(entry, index, totalCount) {
    const star = document.createElement('div');
    const rarity = entry.rarity || 'common';
    const type = entry.type || 'special';
    const points = parseInt(entry.points, 10) || 0;
    star.className = `magic-star magic-star--${rarity} magic-star--type-${type}`;
    star.dataset.id = entry.id;
    star.dataset.type = type;

    const gridCols = Math.ceil(Math.sqrt(totalCount * 0.8));
    const gridRows = Math.ceil(totalCount / gridCols);
    const colIndex = index % gridCols;
    const rowIndex = Math.floor(index / gridCols);
    const baseX = 12 + (colIndex / gridCols) * 76;
    const baseY = 12 + (rowIndex / gridRows) * 76;
    const offsetX = ((index * 37) % 25) - 12;
    const offsetY = ((index * 53) % 25) - 12;
    const posX = Math.max(6, Math.min(94, baseX + offsetX));
    const posY = Math.max(6, Math.min(94, baseY + offsetY));
    const raritySize = 0.08 * ((rarityRank[rarity] || 1) - 1);
    const pointSize = Math.min(0.18, points / 500);
    const size = 0.65 + (index % 5) * 0.06 + raritySize + pointSize;
    const rotation = (index * 47) % 360;
    const layer = index % 3;

    star.style.cssText = `
      left: ${posX}%;
      top: ${posY}%;
      transform: scale(${size});
      --ring-offset: ${rotation}deg;
    `;
    star.dataset.layer = layer;
    star.dataset.x = posX;
    star.dataset.y = posY;
    star.innerHTML = `
      <div class="magic-star__glow"></div>
      <div class="magic-star__cross"></div>
      <div class="magic-star__ring magic-star__ring--back"></div>
      <div class="magic-star__core"></div>
      <div class="magic-star__ring magic-star__ring--front"></div>
      <div class="magic-star__badge">${escapeHtml(getRarityName(rarity))} · ${points}</div>
      <div class="magic-star__label">${escapeHtml(entry.title)}</div>
    `;

    return star;
  }

  async function renderStars() {
    const container = document.getElementById('stars-container');
    const user = await window.PalaceDB.ensureSignedIn('achievements-empty');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      const emptyEl = document.getElementById('achievements-empty');
      if (emptyEl) {
        emptyEl.style.display = 'block';
        emptyEl.innerHTML = `<p class="achievements-empty__text">${escapeHtml(error.message || '加载失败。')}</p>`;
      }
      return;
    }

    applyFilters();

    const totalCount = Math.max(filteredEntries.length, 1);
    const baseHeight = 600;
    const adjustedHeight = Math.max(baseHeight, baseHeight + Math.floor((totalCount - 5) / 5) * 200);
    container.style.minHeight = `${adjustedHeight}px`;
    container.innerHTML = `
      <div class="stars-layer stars-layer--far" style="min-height: ${adjustedHeight}px;"></div>
      <div class="stars-layer stars-layer--mid" style="min-height: ${adjustedHeight}px;"></div>
      <div class="stars-layer stars-layer--near" style="min-height: ${adjustedHeight}px;"></div>
    `;

    const emptyEl = document.getElementById('achievements-empty');
    if (emptyEl) emptyEl.style.display = entries.length ? 'none' : 'block';
    if (entries.length === 0) {
      if (emptyEl) {
        emptyEl.innerHTML = `
          <div class="achievements-empty__icon">⭐</div>
          <p class="achievements-empty__text">暂无成就，点击右下角星星添加第一个里程碑</p>
        `;
      }
      return;
    }
    if (filteredEntries.length === 0) {
      if (emptyEl) {
        emptyEl.style.display = 'block';
        emptyEl.innerHTML = `
          <div class="achievements-empty__icon">⌕</div>
          <p class="achievements-empty__text">当前星图里没有符合条件的成就。</p>
        `;
      }
      return;
    }

    const layers = [
      container.querySelector('.stars-layer--far'),
      container.querySelector('.stars-layer--mid'),
      container.querySelector('.stars-layer--near')
    ];

    stars = [];
    filteredEntries.forEach((entry, index) => {
      const layerIndex = index % 3;
      const star = createStarElement(entry, index, totalCount);
      layers[layerIndex].appendChild(star);
      stars.push({ element: star, entry, layer: layerIndex });
    });

    bindStarEvents();
  }

  function bindStarEvents() {
    stars.forEach((star) => {
      star.element.addEventListener('click', () => openDetailModal(star.entry));
    });
  }

  function openDetailModal(entry) {
    const modal = document.getElementById('achievement-modal');
    const rarity = entry.rarity || 'common';
    const type = entry.type || 'special';
    const points = parseInt(entry.points, 10) || 0;
    modal.innerHTML = `
      <div class="achievement-modal__content achievement-modal__content--${rarity}">
        <button class="achievement-modal__close" type="button">&times;</button>
        <div class="achievement-modal__star magic-star--${rarity} magic-star--type-${type}">
          <div class="magic-star__glow"></div>
          <div class="magic-star__cross"></div>
          <div class="magic-star__ring magic-star__ring--back"></div>
          <div class="magic-star__core"></div>
          <div class="magic-star__ring magic-star__ring--front"></div>
        </div>
        <span class="achievement-modal__unlocked">Achievement Unlocked</span>
        <h2 class="achievement-modal__title">${escapeHtml(entry.title)}</h2>
        <div class="achievement-modal__badges">
          <span>${escapeHtml(getTypeName(type))}</span>
          <span>${escapeHtml(getRarityName(rarity))}</span>
          <span>${points} 点</span>
        </div>
        <p class="achievement-modal__date">${escapeHtml(entry.achievedDate || entry.date || '')}</p>
        <div class="achievement-modal__divider"></div>
        <p class="achievement-modal__label">成就描述</p>
        <p class="achievement-modal__description">${escapeHtml(entry.content) || '暂无描述'}</p>
        <div class="achievement-modal__footer">
          <button class="achievement-modal__edit" data-id="${entry.id}" type="button">编辑</button>
          <button class="achievement-modal__delete" data-id="${entry.id}" type="button">删除</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
    modal.querySelector('.achievement-modal__close').addEventListener('click', closeDetailModal);
    modal.querySelector('.achievement-modal__edit').addEventListener('click', () => {
      closeDetailModal();
      openEditModal(entry.id);
    });
    modal.querySelector('.achievement-modal__delete').addEventListener('click', async () => {
      if (!confirm('确定要删除这个成就吗？')) return;
      await deleteEntry(entry.id);
      closeDetailModal();
    });
  }

  function closeDetailModal() {
    document.getElementById('achievement-modal').classList.remove('active');
  }

  function openAddModal() {
    const form = document.getElementById('achievement-form');
    form.reset();
    delete form.dataset.editId;
    document.getElementById('achievement-type').value = 'life';
    document.getElementById('achievement-rarity').value = 'common';
    document.getElementById('achievement-points').value = 10;
    document.getElementById('achievement-date').value = formatDateValue(new Date());
    document.getElementById('add-modal').classList.add('active');
  }

  function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
  }

  function openEditModal(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    document.getElementById('achievement-title').value = entry.title || '';
    document.getElementById('achievement-content').value = entry.content || '';
    document.getElementById('achievement-type').value = entry.type || 'life';
    document.getElementById('achievement-rarity').value = entry.rarity || 'common';
    document.getElementById('achievement-points').value = parseInt(entry.points, 10) || 10;
    document.getElementById('achievement-date').value = formatDateValue(entry.achievedDate || entry.date || entry.createdAt);
    document.getElementById('achievement-form').dataset.editId = entryId;
    document.getElementById('add-modal').classList.add('active');
  }

  async function deleteEntry(entryId) {
    try {
      await window.PalaceDB.deleteEntry(entryId);
      await renderStars();
    } catch (error) {
      alert(error.message || '删除失败。');
    }
  }

  function updateParallax() {
    const layers = [
      { el: document.querySelector('.stars-layer--far'), factor: 0.02 },
      { el: document.querySelector('.stars-layer--mid'), factor: 0.04 },
      { el: document.querySelector('.stars-layer--near'), factor: 0.06 }
    ];

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    layers.forEach((layer) => {
      if (layer.el) {
        const moveX = (targetX - window.innerWidth / 2) * layer.factor;
        const moveY = (targetY - window.innerHeight / 2) * layer.factor;
        layer.el.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    });

    requestAnimationFrame(updateParallax);
  }

  function init() {
    renderStars();
    updateParallax();
    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    const floatingBtn = document.getElementById('floating-add-btn');
    const addModal = document.getElementById('add-modal');
    const closeAddBtn = document.getElementById('close-add-modal');
    const cancelBtn = document.getElementById('cancel-achievement');
    const form = document.getElementById('achievement-form');
    const filterControls = ['achievement-search', 'achievement-filter-type', 'achievement-filter-rarity', 'achievement-sort'];

    filterControls.forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'achievement-search' ? 'input' : 'change', renderStars);
    });

    floatingBtn.addEventListener('click', openAddModal);
    closeAddBtn.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);
    addModal.addEventListener('click', (event) => {
      if (event.target === addModal) closeAddModal();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const title = document.getElementById('achievement-title').value.trim();
      const content = document.getElementById('achievement-content').value.trim();
      const achievedDate = document.getElementById('achievement-date').value || formatDateValue(new Date());
      if (!title) {
        alert('请输入成就名称。');
        return;
      }

      const now = new Date();
      const editId = form.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const payload = {
        ...(original || {}),
        title,
        content,
        type: document.getElementById('achievement-type').value,
        rarity: document.getElementById('achievement-rarity').value,
        points: Math.max(0, parseInt(document.getElementById('achievement-points').value, 10) || 0),
        achievedDate,
        date: achievedDate || (original ? original.date : formatDateTime(now)),
        createdAt: original ? original.createdAt : now.toISOString()
      };

      try {
        if (editId) {
          await window.PalaceDB.updateEntry(editId, payload);
          delete form.dataset.editId;
        } else {
          await window.PalaceDB.createEntry(page, { ...payload, editCount: 0 });
        }
        closeAddModal();
        await renderStars();
      } catch (error) {
        alert(error.message || '保存失败。');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
