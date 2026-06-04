(function () {
  'use strict';

  const page = 'drinks';
  const DRINK_TYPES = {
    yogurt: '酸奶',
    coffee: '咖啡',
    milktea: '奶茶',
    fruittea: '果茶',
    tea: '茶饮',
    alcohol: '酒',
    sparkling: '气泡水',
    juice: '果汁',
    cocoa: '可可',
    special: '特调',
    other: '其他'
  };

  const DRINK_ICONS = {
    yogurt: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 16h24v4H20v-4z" fill="#8B7B6B"/><path d="M18 20h28l-4 36H22l-4-36z" fill="#F5F0E6" stroke="#D4C4A8" stroke-width="2"/></svg>',
    coffee: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 24h28v4H16v-4z" fill="#8B7B6B"/><path d="M14 28h32v24c0 4-4 8-8 8H22c-4 0-8-4-8-8V28z" fill="#E8D4B8" stroke="#C4A070" stroke-width="2"/><path d="M46 32h6c4 0 6 2 6 6v4c0 4-2 6-6 6h-6" stroke="#C4A070" stroke-width="2"/></svg>',
    milktea: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12h24v6H20v-6z" fill="#C4A070"/><path d="M18 18h28l-2 38H20l-2-38z" fill="#FFE4C4" stroke="#D4B896" stroke-width="2"/></svg>',
    fruittea: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 14h24v4H20v-4z" fill="#8B7B6B"/><path d="M18 18h28l-4 34H22l-4-34z" fill="#FFE0CC" stroke="#FFD0B0" stroke-width="2"/><circle cx="26" cy="32" r="4" fill="#FF9E80"/></svg>',
    tea: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 22h30v8c0 10-6 18-15 18S18 40 18 30v-8z" fill="#DDECC8" stroke="#93A86B" stroke-width="2"/><path d="M48 28h7c2 0 4 2 4 5s-2 5-5 5h-6" stroke="#93A86B" stroke-width="2"/></svg>',
    alcohol: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 10h16l-3 22v18l8 6H19l8-6V32L24 10z" fill="#F0D6C0" stroke="#A67B5B" stroke-width="2"/><path d="M27 30h10" stroke="#B65F46" stroke-width="4"/></svg>',
    sparkling: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 14h20l-3 42H25L22 14z" fill="#D8F3FF" stroke="#8ECBE0" stroke-width="2"/><circle cx="30" cy="28" r="2" fill="#8ECBE0"/><circle cx="36" cy="38" r="2" fill="#8ECBE0"/></svg>',
    juice: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 18h28l-5 38H25l-5-38z" fill="#FFD1A6" stroke="#E58B5A" stroke-width="2"/><path d="M26 12h18" stroke="#8B7B6B" stroke-width="3"/></svg>',
    cocoa: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 26h32v22c0 6-5 10-11 10H27c-6 0-11-4-11-10V26z" fill="#C9A27E" stroke="#7A4F35" stroke-width="2"/><path d="M48 32h6c4 0 6 2 6 6s-2 6-6 6h-6" stroke="#7A4F35" stroke-width="2"/></svg>',
    special: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 12h16l-4 18v20l8 8H20l8-8V30L24 12z" fill="#E8DCF0" stroke="#9B6E9B" stroke-width="2"/><path d="M28 34h8M26 40h12" stroke="#D4AF37" stroke-width="2"/></svg>',
    other: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16h20v4H22v-4z" fill="#8B7B6B"/><path d="M20 20h24v32c0 4-4 8-8 8H28c-4 0-8-4-8-8V20z" fill="#E8DCF0" stroke="#DCD0E8" stroke-width="2"/></svg>'
  };

  let entries = [];
  let filteredEntries = [];

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function normalizeTags(rawTags) {
    const tags = Array.isArray(rawTags) ? rawTags : [rawTags];
    return Array.from(new Set(tags
      .flatMap((tag) => String(tag || '').split(/[,，、\s]+/))
      .map((tag) => tag.trim())
      .filter(Boolean)));
  }

  function getSelectedFlavorTags() {
    const selected = Array.from(document.querySelectorAll('.flavor-tag-option.active'))
      .map((button) => button.dataset.tag);
    const custom = document.getElementById('drink-custom-tags').value;
    return normalizeTags([...selected, custom]);
  }

  function setSelectedFlavorTags(tags) {
    const normalized = normalizeTags(tags || []);
    const presetTags = Array.from(document.querySelectorAll('.flavor-tag-option'))
      .map((button) => button.dataset.tag);

    document.querySelectorAll('.flavor-tag-option').forEach((button) => {
      button.classList.toggle('active', normalized.includes(button.dataset.tag));
    });

    document.getElementById('drink-custom-tags').value = normalized
      .filter((tag) => !presetTags.includes(tag))
      .join('，');
  }

  function getFilters() {
    return {
      search: document.getElementById('drink-search').value.trim().toLowerCase(),
      type: document.getElementById('drink-filter-type').value,
      repurchase: document.getElementById('drink-filter-repurchase').value,
      rating: parseInt(document.getElementById('drink-filter-rating').value, 10) || 0,
      sort: document.getElementById('drink-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        entry.name,
        entry.title,
        entry.shop,
        entry.notes,
        normalizeTags(entry.flavorTags || entry.tags || []).join(' '),
        entry.toppings
      ].join(' ').toLowerCase();
      const rating = parseInt(entry.rating, 10) || 0;
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.type && (entry.type || 'other') !== filters.type) return false;
      if (filters.repurchase && (entry.repurchase || 'maybe') !== filters.repurchase) return false;
      if (filters.rating && rating < filters.rating) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'price-desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      if (filters.sort === 'price-asc') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      if (filters.sort === 'name-asc') return String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''), 'zh-CN');
      return String(b.tastedDate || b.date || '').localeCompare(String(a.tastedDate || a.date || ''));
    });
  }

  function getRepurchaseLabel(value) {
    const labels = {
      yes: '会回购',
      maybe: '看心情',
      no: '不回购'
    };
    return labels[value] || '看心情';
  }

  function renderStats() {
    const stats = document.getElementById('drink-stats');
    if (!stats) return;
    const total = entries.length;
    const fiveStars = entries.filter((entry) => (parseInt(entry.rating, 10) || 0) === 5).length;
    const repurchases = entries.filter((entry) => entry.repurchase === 'yes').length;
    const typeCounts = entries.reduce((acc, entry) => {
      const type = entry.type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    stats.innerHTML = `
      <div class="drink-stat">
        <span class="drink-stat__value">${total}</span>
        <span class="drink-stat__label">杯珍藏</span>
      </div>
      <div class="drink-stat">
        <span class="drink-stat__value">${fiveStars}</span>
        <span class="drink-stat__label">五星饮品</span>
      </div>
      <div class="drink-stat">
        <span class="drink-stat__value">${repurchases}</span>
        <span class="drink-stat__label">回购清单</span>
      </div>
      <div class="drink-stat">
        <span class="drink-stat__value">${topType ? escapeHtml(DRINK_TYPES[topType[0]] || '其他') : '-'}</span>
        <span class="drink-stat__label">最常喝</span>
      </div>
    `;
  }

  function generateStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  function getDrinkName(entry) {
    return entry.name || entry.title || '未命名饮品';
  }

  function getTodayRecommendation() {
    const repurchaseEntries = entries.filter((entry) => entry.repurchase === 'yes');
    if (!repurchaseEntries.length) return null;
    const today = formatDateTime(new Date());
    const seed = today.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return repurchaseEntries[seed % repurchaseEntries.length];
  }

  function renderTodayRecommendation() {
    const recommended = getTodayRecommendation();
    if (!recommended) {
      return `
        <section class="drink-today-card drink-today-card--empty" aria-label="今日推荐">
          <span class="drink-today-card__label">今日推荐</span>
          <p class="drink-today-card__empty">还没有标记“会回购”的饮品，先把心头好收入回购清单吧。</p>
        </section>
      `;
    }

    const type = recommended.type || 'other';
    const tags = normalizeTags(recommended.flavorTags || recommended.tags || []).slice(0, 3);

    return `
      <section class="drink-today-card drink-today-card--${type}" aria-label="今日推荐">
        <div class="drink-today-card__copy">
          <span class="drink-today-card__label">今日推荐</span>
          <button class="drink-today-card__name" type="button" data-id="${escapeHtml(recommended.id)}">
            ${escapeHtml(getDrinkName(recommended))}
          </button>
          <p class="drink-today-card__meta">
            ${escapeHtml(DRINK_TYPES[type] || '其他')} · ${escapeHtml(recommended.shop || '未知来源')} · ${generateStars(recommended.rating || 0)}
          </p>
          ${tags.length ? `<div class="drink-today-card__tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </div>
        <span class="drink-today-card__stamp">REPURCHASE</span>
      </section>
    `;
  }

  async function renderList() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      container.innerHTML = `<div class="drinks-empty"><p>${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    renderStats();
    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="drink-menu-paper drink-menu-paper--empty">
          <div class="drink-menu-paper__seal">DRINKS</div>
          <h2 class="drink-menu-paper__title">饮品清单</h2>
          <p class="drinks-empty__text">暂无记录，点击右下角杯子添加第一杯珍藏。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="drink-menu-paper drink-menu-paper--empty">
          <div class="drink-menu-paper__seal">NO MATCH</div>
          ${renderTodayRecommendation()}
          <h2 class="drink-menu-paper__title">饮品清单</h2>
          <p class="drinks-empty__text">这张清单上暂时没有符合条件的饮品。</p>
        </div>
      `;
      bindListEvents();
      return;
    }

    container.innerHTML = `
      <div class="drink-menu-paper">
        <div class="drink-menu-paper__seal">DRINKS</div>
        <div class="drink-menu-paper__header">
          <span class="drink-menu-paper__overline">Private Tasting Menu</span>
          <h2 class="drink-menu-paper__title">饮品清单</h2>
          <p class="drink-menu-paper__subtitle">点击饮品名，打开私人品鉴单。</p>
        </div>
        ${renderTodayRecommendation()}
        <ol class="drink-menu-list">
          ${filteredEntries.map((entry, index) => {
            const type = entry.type || 'other';
            const typeLabel = DRINK_TYPES[type] || '其他';
            const name = getDrinkName(entry);
            const tags = normalizeTags(entry.flavorTags || entry.tags || []).slice(0, 3);
            const date = entry.tastedDate || entry.date || '未记录日期';

            return `
              <li class="drink-menu-item drink-menu-item--${type}">
                <span class="drink-menu-item__number">${String(index + 1).padStart(2, '0')}</span>
                <button class="drink-menu-item__name" type="button" data-id="${escapeHtml(entry.id)}">
                  ${escapeHtml(name)}
                </button>
                <span class="drink-menu-item__line" aria-hidden="true"></span>
                <span class="drink-menu-item__rating">${generateStars(entry.rating || 0)}</span>
                <div class="drink-menu-item__meta">
                  <span>${escapeHtml(typeLabel)}</span>
                  <span>${escapeHtml(entry.shop || '未知来源')}</span>
                  <span>${escapeHtml(date)}</span>
                  <span>${escapeHtml(getRepurchaseLabel(entry.repurchase || 'maybe'))}</span>
                </div>
                ${tags.length ? `<div class="drink-menu-item__tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
              </li>
            `;
          }).join('')}
        </ol>
      </div>
    `;

    bindListEvents();
  }

  function bindListEvents() {
    document.querySelectorAll('.drink-menu-item__name').forEach((button) => {
      button.addEventListener('click', () => openDetailModal(button.dataset.id));
    });
    document.querySelectorAll('.drink-today-card__name').forEach((button) => {
      button.addEventListener('click', () => openDetailModal(button.dataset.id));
    });
  }

  function openDetailModal(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const modal = document.getElementById('detail-modal');
    const type = entry.type || 'other';
    const icon = DRINK_ICONS[type] || DRINK_ICONS.other;
    const typeLabel = DRINK_TYPES[type] || '其他';
    const tags = normalizeTags(entry.flavorTags || entry.tags || []);

    modal.innerHTML = `
      <div class="drink-modal__content drink-modal__content--${type}">
        <button class="drink-modal__close" id="close-detail" type="button" aria-label="关闭">&times;</button>
        <div class="drink-modal__header">
          <div class="drink-modal__icon">${icon}</div>
          <span class="drink-modal__eyebrow">Tasting Sheet</span>
          <h2 class="drink-modal__title">${escapeHtml(getDrinkName(entry))}</h2>
          <p class="drink-modal__shop">${escapeHtml(entry.shop || '未知来源')}</p>
          <div class="drink-modal__rating">${generateStars(entry.rating || 0)}</div>
          <span class="drink-modal__type">${escapeHtml(typeLabel)}</span>
        </div>
        <div class="drink-modal__body">
          <div class="drink-modal__specs">
            ${entry.price ? `<span>¥ ${escapeHtml(entry.price)}</span>` : ''}
            ${entry.sweetness ? `<span>${escapeHtml(entry.sweetness)}</span>` : ''}
            ${entry.ice ? `<span>${escapeHtml(entry.ice)}</span>` : ''}
            ${entry.size ? `<span>${escapeHtml(entry.size)}</span>` : ''}
            <span>${escapeHtml(getRepurchaseLabel(entry.repurchase || 'maybe'))}</span>
          </div>
          ${tags.length ? `
            <div class="drink-modal__flavors">
              ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
          ${entry.toppings ? `
            <section class="drink-modal__toppings">
              <p class="drink-modal__label">配料 / 小料</p>
              <p>${escapeHtml(entry.toppings)}</p>
            </section>
          ` : ''}
          <p class="drink-modal__label">品鉴感受</p>
          <p class="drink-modal__notes">${escapeHtml(entry.notes) || '暂无品鉴记录'}</p>
        </div>
        <div class="drink-modal__footer">
          <span class="drink-modal__date">${escapeHtml(entry.tastedDate || entry.date || '')}</span>
          <div class="drink-modal__actions">
            <button class="drink-modal__edit" data-id="${entry.id}" type="button">编辑</button>
            <button class="drink-modal__delete" data-id="${entry.id}" type="button">删除</button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.getElementById('close-detail').addEventListener('click', closeDetailModal);
    modal.querySelector('.drink-modal__edit').addEventListener('click', () => {
      closeDetailModal();
      openEditModal(entryId);
    });
    modal.querySelector('.drink-modal__delete').addEventListener('click', async () => {
      if (!confirm('确定要删除这条饮品记录吗？')) return;
      await deleteEntry(entryId);
      closeDetailModal();
    });
  }

  function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
  }

  function openAddModal() {
    const modal = document.getElementById('add-modal');
    const form = document.getElementById('drink-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelectorAll('.drink-form .star').forEach((star) => star.classList.remove('active'));
    setSelectedFlavorTags([]);
    document.getElementById('drink-rating').value = 0;
    document.getElementById('drink-repurchase').value = 'maybe';
    document.getElementById('drink-date').value = formatDateTime(new Date());
    document.querySelector('.add-modal__title').textContent = '添加饮品';
    modal.classList.add('active');
  }

  function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
  }

  function openEditModal(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    document.getElementById('drink-name').value = getDrinkName(entry);
    document.getElementById('drink-shop').value = entry.shop || '';
    document.getElementById('drink-type').value = entry.type || 'other';
    document.getElementById('drink-date').value = entry.tastedDate || entry.date || '';
    document.getElementById('drink-price').value = entry.price || '';
    document.getElementById('drink-sweetness').value = entry.sweetness || '';
    document.getElementById('drink-ice').value = entry.ice || '';
    document.getElementById('drink-size').value = entry.size || '';
    document.getElementById('drink-repurchase').value = entry.repurchase || 'maybe';
    document.getElementById('drink-toppings').value = entry.toppings || '';
    document.getElementById('drink-notes').value = entry.notes || '';
    document.getElementById('drink-rating').value = entry.rating || 0;
    setSelectedFlavorTags(entry.flavorTags || entry.tags || []);
    document.querySelectorAll('.drink-form .star').forEach((star, index) => {
      star.classList.toggle('active', index < (entry.rating || 0));
    });

    document.querySelector('.add-modal__title').textContent = '编辑饮品';
    document.getElementById('drink-form').dataset.editId = entryId;
    document.getElementById('add-modal').classList.add('active');
  }

  async function deleteEntry(entryId) {
    try {
      await window.PalaceDB.deleteEntry(entryId);
      await renderList();
    } catch (error) {
      alert(error.message || '删除失败。');
    }
  }

  function initStarRating() {
    document.querySelectorAll('.star-rating').forEach((container) => {
      const stars = container.querySelectorAll('.star');
      const input = container.parentElement.querySelector('input[type="hidden"]');

      stars.forEach((star) => {
        star.addEventListener('click', () => {
          const value = parseInt(star.dataset.value, 10);
          if (input) input.value = value;
          stars.forEach((item, index) => item.classList.toggle('active', index < value));
        });
      });
    });
  }

  function initFlavorTags() {
    document.querySelectorAll('.flavor-tag-option').forEach((button) => {
      button.addEventListener('click', () => button.classList.toggle('active'));
    });
  }

  function initFilters() {
    ['drink-search', 'drink-filter-type', 'drink-filter-repurchase', 'drink-filter-rating', 'drink-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'drink-search' ? 'input' : 'change', renderList);
    });
  }

  function init() {
    renderList();
    initStarRating();
    initFlavorTags();
    initFilters();

    const floatingBtn = document.getElementById('floating-add-btn');
    const addModal = document.getElementById('add-modal');
    const detailModal = document.getElementById('detail-modal');
    const closeAddBtn = document.getElementById('close-add-modal');
    const cancelAddBtn = document.getElementById('cancel-drink');
    const drinkForm = document.getElementById('drink-form');

    floatingBtn.addEventListener('click', openAddModal);
    closeAddBtn.addEventListener('click', closeAddModal);
    cancelAddBtn.addEventListener('click', closeAddModal);
    addModal.addEventListener('click', (event) => {
      if (event.target === addModal) closeAddModal();
    });
    detailModal.addEventListener('click', (event) => {
      if (event.target === detailModal) closeDetailModal();
    });

    drinkForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = document.getElementById('drink-name').value.trim();
      const shop = document.getElementById('drink-shop').value.trim();
      const type = document.getElementById('drink-type').value;
      const tastedDate = document.getElementById('drink-date').value || formatDateTime(new Date());
      const price = document.getElementById('drink-price').value.trim();
      const sweetness = document.getElementById('drink-sweetness').value;
      const ice = document.getElementById('drink-ice').value;
      const size = document.getElementById('drink-size').value.trim();
      const repurchase = document.getElementById('drink-repurchase').value;
      const flavorTags = getSelectedFlavorTags();
      const toppings = document.getElementById('drink-toppings').value.trim();
      const rating = parseInt(document.getElementById('drink-rating').value, 10) || 0;
      const notes = document.getElementById('drink-notes').value.trim();

      if (!name) {
        alert('请输入饮品名称。');
        return;
      }

      const now = new Date();
      const editId = drinkForm.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const payload = {
        ...(original || {}),
        name,
        title: name,
        shop,
        type,
        tastedDate,
        price,
        sweetness,
        ice,
        size,
        repurchase,
        flavorTags,
        tags: flavorTags,
        toppings,
        rating,
        notes,
        content: notes,
        date: tastedDate || (original ? original.date : formatDateTime(now)),
        createdAt: original ? original.createdAt : now.toISOString()
      };

      try {
        if (editId) {
          await window.PalaceDB.updateEntry(editId, payload);
          delete drinkForm.dataset.editId;
        } else {
          await window.PalaceDB.createEntry(page, { ...payload, editCount: 0 });
        }
        closeAddModal();
        await renderList();
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
