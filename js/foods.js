(function () {
  'use strict';

  const page = 'foods';
  let entries = [];
  let filteredEntries = [];
  let activeEntryId = null;
  let activeEntry = null;

  const typeNames = {
    meal: '正餐',
    snack: '小吃',
    dessert: '甜品',
    breakfast: '早餐',
    hotpot: '火锅 / 烧烤',
    takeout: '外卖',
    homemade: '家常 / 自制',
    other: '其他'
  };

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

  function normalizeTags(rawTags) {
    const tags = Array.isArray(rawTags) ? rawTags : [rawTags];
    return Array.from(new Set(tags
      .flatMap((tag) => String(tag || '').split(/[,，、\s]+/))
      .map((tag) => tag.trim())
      .filter(Boolean)));
  }

  function getName(entry) {
    return entry.name || entry.foodName || entry.title || '未命名美食';
  }

  function getTypeName(type) {
    return typeNames[type] || '其他';
  }

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '✦'.repeat(value) + '·'.repeat(5 - value);
  }

  function getFilters() {
    return {
      search: document.getElementById('food-search').value.trim().toLowerCase(),
      type: document.getElementById('food-filter-type').value,
      rating: parseInt(document.getElementById('food-filter-rating').value, 10) || 0,
      sort: document.getElementById('food-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        getName(entry),
        entry.place,
        entry.cuisine,
        entry.price,
        normalizeTags(entry.tags || []).join(' '),
        entry.notes || entry.content
      ].join(' ').toLowerCase();
      const rating = parseInt(entry.rating, 10) || 0;
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.type && (entry.type || 'other') !== filters.type) return false;
      if (filters.rating && rating < filters.rating) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'date-desc') return String(b.tastedDate || '').localeCompare(String(a.tastedDate || ''));
      if (filters.sort === 'name-asc') return getName(a).localeCompare(getName(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="foods-modal" id="foods-modal" role="dialog" aria-modal="true" aria-labelledby="foods-modal-title">
        <div class="foods-modal__panel">
          <button class="foods-modal__close" id="foods-modal-close" type="button" aria-label="关闭">×</button>
          <div class="foods-modal__header">
            <span class="foods-modal__eyebrow">Gourmet Note</span>
            <h2 class="foods-modal__title" id="foods-modal-title"></h2>
            <p class="foods-modal__sub" id="foods-modal-sub"></p>
            <div class="foods-modal__rating" id="foods-modal-rating"></div>
          </div>
          <div class="foods-modal__body">
            <div class="foods-modal__meta" id="foods-modal-meta"></div>
            <div class="foods-modal__tags" id="foods-modal-tags"></div>
            <p class="foods-modal__notes" id="foods-modal-notes"></p>
          </div>
          <div class="foods-modal__footer">
            <span id="foods-modal-edit-count"></span>
            <div class="foods-modal__actions">
              <button class="foods-modal__edit" id="foods-modal-edit" type="button">编辑</button>
              <button class="foods-modal__delete" id="foods-modal-delete" type="button">删除</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function renderEntries() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      container.innerHTML = `<div class="foods-empty"><p class="foods-empty__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="foods-empty">
          <div class="foods-empty__icon">◇</div>
          <p class="foods-empty__text">食笺还空着，添上第一道尝过的美食吧。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="foods-empty">
          <div class="foods-empty__icon">⌕</div>
          <p class="foods-empty__text">没有找到符合条件的美食记录。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="foods-banquet">
        ${filteredEntries.map((entry, index) => {
          const tags = normalizeTags(entry.tags || []);
          const type = entry.type || 'other';
          const badges = [
            entry.revisit ? '愿意再吃' : '',
            entry.signature ? '招牌推荐' : ''
          ].filter(Boolean);
          return `
            <article class="food-card food-card--${type}" data-id="${escapeHtml(entry.id)}" style="--delay: ${index * 36}ms;">
              <button class="food-card__button" type="button">
                <span class="food-card__plate" aria-hidden="true"></span>
                <span class="food-card__type">${escapeHtml(getTypeName(type))}</span>
                <h2 class="food-card__name">${escapeHtml(getName(entry))}</h2>
                <p class="food-card__place">${escapeHtml(entry.place || '地点未记录')}</p>
                <p class="food-card__cuisine">${escapeHtml(entry.cuisine || entry.price || '风味待补充')}</p>
                <span class="food-card__rating">${renderStars(entry.rating || 0)}</span>
                ${badges.length ? `<div class="food-card__badges">${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}</div>` : ''}
                ${tags.length ? `<div class="food-card__tags">${tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
              </button>
            </article>
          `;
        }).join('')}
      </div>
      ${createModalHtml()}
    `;

    bindCardEvents();
  }

  function bindCardEvents() {
    document.querySelectorAll('.food-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.food-card__button').addEventListener('click', () => {
        if (entry) openModal(entry);
      });
    });

    document.getElementById('foods-modal-close').addEventListener('click', closeModal);
    document.getElementById('foods-modal').addEventListener('click', (event) => {
      if (event.target.id === 'foods-modal') closeModal();
    });
    document.getElementById('foods-modal-edit').addEventListener('click', () => {
      if (!activeEntry) return;
      const entryToEdit = activeEntry;
      closeModal();
      openForm(entryToEdit);
    });
    document.getElementById('foods-modal-delete').addEventListener('click', deleteActiveEntry);
  }

  function openModal(entry) {
    activeEntryId = entry.id;
    activeEntry = entry;
    const tags = normalizeTags(entry.tags || []);
    const meta = [
      getTypeName(entry.type),
      entry.place,
      entry.cuisine,
      entry.price,
      entry.tastedDate ? `品尝 ${entry.tastedDate}` : '',
      entry.revisit ? '愿意再吃' : '',
      entry.signature ? '招牌级推荐' : ''
    ].filter(Boolean);

    document.getElementById('foods-modal-title').textContent = getName(entry);
    document.getElementById('foods-modal-sub').textContent = [entry.place, entry.cuisine].filter(Boolean).join(' · ') || '美食食笺';
    document.getElementById('foods-modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('foods-modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('foods-modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('foods-modal-notes').textContent = entry.notes || entry.content || '暂无品尝感想';
    document.getElementById('foods-modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
    document.getElementById('foods-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('foods-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    activeEntryId = null;
    activeEntry = null;
  }

  async function deleteActiveEntry() {
    if (!activeEntryId || !confirm('确定要从饕餮食笺移除这道美食吗？')) return;
    try {
      await window.PalaceDB.deleteEntry(activeEntryId);
      closeModal();
      await renderEntries();
    } catch (error) {
      alert(error.message || '删除失败。');
    }
  }

  function setRating(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    document.getElementById('food-rating').value = value;
    document.querySelectorAll('.food-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.foods-form__title').textContent = '记录一道尝过的美食';
    document.querySelector('.foods-submit-btn').textContent = '收入食笺';
    setRating(0);
  }

  function closeForm() {
    const form = document.getElementById('input-form');
    form.classList.remove('active');
    document.getElementById('add-btn').style.display = 'inline-flex';
    resetForm();
  }

  function openForm(entry) {
    const form = document.getElementById('input-form');
    form.classList.add('active');
    document.getElementById('add-btn').style.display = 'none';

    if (entry) {
      form.dataset.editId = entry.id;
      document.querySelector('.foods-form__title').textContent = '修订这枚食笺';
      document.querySelector('.foods-submit-btn').textContent = '保存修订';
      document.getElementById('food-name').value = getName(entry);
      document.getElementById('food-place').value = entry.place || '';
      document.getElementById('food-type').value = entry.type || 'other';
      document.getElementById('food-cuisine').value = entry.cuisine || '';
      document.getElementById('food-price').value = entry.price || '';
      document.getElementById('food-date').value = formatDateValue(entry.tastedDate);
      document.getElementById('food-revisit').checked = Boolean(entry.revisit);
      document.getElementById('food-signature').checked = Boolean(entry.signature);
      document.getElementById('food-tags').value = normalizeTags(entry.tags || []).join('，');
      document.getElementById('food-notes').value = entry.notes || entry.content || '';
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    document.getElementById('food-name').focus();
  }

  function buildPayload(original) {
    const name = document.getElementById('food-name').value.trim();
    const notes = document.getElementById('food-notes').value.trim();
    const tastedDate = formatDateValue(document.getElementById('food-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title: name,
      name,
      foodName: name,
      place: document.getElementById('food-place').value.trim(),
      type: document.getElementById('food-type').value,
      cuisine: document.getElementById('food-cuisine').value.trim(),
      price: document.getElementById('food-price').value,
      tastedDate,
      rating: parseInt(document.getElementById('food-rating').value, 10) || 0,
      revisit: document.getElementById('food-revisit').checked,
      signature: document.getElementById('food-signature').checked,
      tags: normalizeTags(document.getElementById('food-tags').value),
      notes,
      content: notes,
      date: tastedDate || (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindInteractions() {
    document.querySelectorAll('.food-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    ['food-search', 'food-filter-type', 'food-filter-rating', 'food-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'food-search' ? 'input' : 'change', renderEntries);
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const form = document.getElementById('input-form');
    const cancelBtn = document.getElementById('cancel-form');

    bindInteractions();
    renderEntries();

    addBtn.addEventListener('click', () => openForm());
    cancelBtn.addEventListener('click', closeForm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = document.getElementById('food-name').value.trim();
      if (!name) {
        alert('请填写美食名称。');
        return;
      }

      const editId = form.dataset.editId;
      const original = entries.find((entry) => entry.id === editId);
      const payload = buildPayload(original);
      const submitBtn = form.querySelector('[type="submit"]');
      const previousText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '保存中...';

      try {
        if (editId) {
          await window.PalaceDB.updateEntry(editId, {
            ...payload,
            editCount: (original ? original.editCount || 0 : 0) + 1
          });
        } else {
          await window.PalaceDB.createEntry(page, payload);
        }
        closeForm();
        await renderEntries();
      } catch (error) {
        alert(error.message || '保存失败。');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = previousText;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
