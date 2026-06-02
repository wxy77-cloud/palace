(function () {
  'use strict';

  const page = 'anime';
  let entries = [];
  let filteredEntries = [];
  let activeEntryId = null;
  let activeModalEntry = null;

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

  function getTitle(entry) {
    return entry.title || entry.animeTitle || '未命名番剧';
  }

  function getTypeName(type) {
    const typeMap = {
      healing: '治愈日常',
      romance: '恋爱青春',
      adventure: '冒险奇幻',
      action: '热血战斗',
      mystery: '悬疑推理',
      'sci-fi': '科幻机甲',
      sports: '运动竞技',
      drama: '剧情催泪',
      comedy: '搞笑轻松',
      other: '其他'
    };
    return typeMap[type] || '';
  }

  function renderRating(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '✿'.repeat(value) + '·'.repeat(5 - value);
  }

  function getBloomClass(entry) {
    const status = entry.status || '';
    if (status === '已看完') return 'anime-bloom--full';
    if (status === '在看' || status === '追更中') return 'anime-bloom--growing';
    if (status === '想看') return 'anime-bloom--seed';
    if (status === '重刷') return 'anime-bloom--rebloom';
    if (status === '弃番' || status === '暂停') return 'anime-bloom--quiet';
    return 'anime-bloom--full';
  }

  function getTypeClass(entry) {
    return `anime-card--${entry.type || 'other'}`;
  }

  function getFilters() {
    return {
      search: document.getElementById('anime-search').value.trim().toLowerCase(),
      status: document.getElementById('anime-filter-status').value,
      type: document.getElementById('anime-filter-type').value,
      rating: parseInt(document.getElementById('anime-filter-rating').value, 10) || 0,
      sort: document.getElementById('anime-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        getTitle(entry),
        entry.originalTitle,
        entry.favoriteCharacter,
        entry.platform,
        normalizeTags(entry.tags || []).join(' ')
      ].join(' ').toLowerCase();
      const rating = parseInt(entry.rating, 10) || 0;
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.status && entry.status !== filters.status) return false;
      if (filters.type && entry.type !== filters.type) return false;
      if (filters.rating && rating < filters.rating) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'watch-desc') return String(b.watchDate || '').localeCompare(String(a.watchDate || ''));
      if (filters.sort === 'year-desc') return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
      if (filters.sort === 'title-asc') return getTitle(a).localeCompare(getTitle(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="anime-modal" id="anime-modal" role="dialog" aria-modal="true" aria-labelledby="anime-modal-title">
        <div class="anime-modal__panel">
          <button class="anime-modal__close" id="anime-modal-close" type="button" aria-label="关闭">×</button>
          <div class="anime-modal__screen">
            <section class="anime-modal__poster">
              <span class="anime-modal__label">放映小亭</span>
              <h2 class="anime-modal__title" id="anime-modal-title"></h2>
              <p class="anime-modal__original" id="anime-modal-original"></p>
              <div class="anime-modal__rating" id="anime-modal-rating"></div>
              <div class="anime-modal__meta" id="anime-modal-meta"></div>
              <div class="anime-modal__tags" id="anime-modal-tags"></div>
            </section>
            <section class="anime-modal__notes">
              <span class="anime-modal__label">花园札记</span>
              <div class="anime-modal__scene" id="anime-modal-scene"></div>
              <div class="anime-modal__review" id="anime-modal-review"></div>
              <div class="anime-modal__footer">
                <span class="anime-modal__edit-count" id="anime-modal-edit-count"></span>
                <div class="anime-modal__actions">
                  <button class="anime-modal__edit" id="anime-modal-edit" type="button">编辑</button>
                  <button class="anime-modal__delete" id="anime-modal-delete" type="button">删除</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function renderGarden() {
    const container = document.getElementById('entries-container');
    if (!container) return;
    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="anime-empty">
          <div class="anime-empty__icon">🌸</div>
          <p class="anime-empty__text">花园还未播种，添加第一部番剧让第一朵花开放。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="anime-empty">
          <div class="anime-empty__icon">⌕</div>
          <p class="anime-empty__text">这片花圃里暂时没有符合条件的番剧。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="anime-garden-bed">
        ${filteredEntries.map((entry, index) => {
          const tags = normalizeTags(entry.tags || []);
          const rating = parseInt(entry.rating, 10) || 0;
          const typeName = getTypeName(entry.type);
          return `
            <article class="anime-card ${getTypeClass(entry)}" data-id="${escapeHtml(entry.id)}" style="--delay: ${index * 45}ms;">
              <button class="anime-card__button" type="button" title="${escapeHtml(getTitle(entry))}">
                <span class="anime-bloom ${getBloomClass(entry)} anime-bloom--rating-${rating}" aria-hidden="true">
                  <span class="anime-bloom__petal anime-bloom__petal--1"></span>
                  <span class="anime-bloom__petal anime-bloom__petal--2"></span>
                  <span class="anime-bloom__petal anime-bloom__petal--3"></span>
                  <span class="anime-bloom__petal anime-bloom__petal--4"></span>
                  <span class="anime-bloom__core"></span>
                </span>
                <span class="anime-card__status">${escapeHtml(entry.status || '状态未记录')}</span>
                <h2 class="anime-card__title">${escapeHtml(getTitle(entry))}</h2>
                <span class="anime-card__rating">${renderRating(rating)}</span>
                <span class="anime-card__meta">${escapeHtml(typeName || '类型未记录')}${entry.year ? ` · ${escapeHtml(entry.year)}` : ''}</span>
                ${tags.length ? `<span class="anime-card__tags">${tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</span>` : ''}
              </button>
            </article>
          `;
        }).join('')}
      </div>
      ${createModalHtml()}
    `;

    bindGardenEvents();
  }

  async function loadEntries() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
      renderGarden();
    } catch (error) {
      container.innerHTML = `<div class="anime-empty"><p class="anime-empty__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
    }
  }

  function bindGardenEvents() {
    document.querySelectorAll('.anime-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.anime-card__button').addEventListener('click', () => {
        if (entry) openModal(entry);
      });
    });

    document.getElementById('anime-modal-close').addEventListener('click', closeModal);
    document.getElementById('anime-modal').addEventListener('click', (event) => {
      if (event.target.id === 'anime-modal') closeModal();
    });
    document.getElementById('anime-modal-edit').addEventListener('click', () => {
      if (!activeModalEntry) return;
      const entryToEdit = activeModalEntry;
      closeModal();
      openForm(entryToEdit);
    });
    document.getElementById('anime-modal-delete').addEventListener('click', deleteActiveEntry);
  }

  function openModal(entry) {
    activeEntryId = entry.id;
    activeModalEntry = entry;
    const tags = normalizeTags(entry.tags || []);
    const meta = [
      entry.status || '状态未记录',
      getTypeName(entry.type),
      entry.year ? `${entry.year} 年` : '',
      entry.progress ? `进度 ${entry.progress}` : '',
      entry.watchDate ? `观看 ${entry.watchDate}` : '',
      entry.platform ? `平台 ${entry.platform}` : '',
      entry.favoriteCharacter ? `喜欢 ${entry.favoriteCharacter}` : ''
    ].filter(Boolean);

    document.getElementById('anime-modal-title').textContent = getTitle(entry);
    document.getElementById('anime-modal-original').textContent = entry.originalTitle || '';
    document.getElementById('anime-modal-rating').textContent = renderRating(entry.rating || 0);
    document.getElementById('anime-modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('anime-modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('anime-modal-scene').textContent = entry.favoriteScene || '';
    document.getElementById('anime-modal-review').textContent = entry.review || entry.content || '暂无观后感';
    document.getElementById('anime-modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;

    document.getElementById('anime-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('anime-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    activeEntryId = null;
    activeModalEntry = null;
  }

  async function deleteActiveEntry() {
    if (!activeEntryId || !confirm('确定要从花园移除这部番剧吗？')) return;
    try {
      await window.PalaceDB.deleteEntry(activeEntryId);
      closeModal();
      await loadEntries();
    } catch (error) {
      alert(error.message || '删除失败。');
    }
  }

  function setRating(value) {
    const rating = Math.max(0, Math.min(5, parseInt(value, 10) || 0));
    document.getElementById('anime-rating-value').value = rating;
    document.querySelectorAll('.anime-petal').forEach((petal, index) => {
      petal.classList.toggle('active', index < rating);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.anime-form__title').textContent = '记录一部番剧';
    document.querySelector('.anime-submit-btn').textContent = '种进花园';
    document.getElementById('anime-status').value = '已看完';
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
      document.querySelector('.anime-form__title').textContent = '修剪这朵番剧花';
      document.querySelector('.anime-submit-btn').textContent = '保存花签';
      document.getElementById('anime-title').value = getTitle(entry);
      document.getElementById('anime-original-title').value = entry.originalTitle || '';
      document.getElementById('anime-status').value = entry.status || '已看完';
      document.getElementById('anime-type').value = entry.type || '';
      document.getElementById('anime-year').value = entry.year || '';
      document.getElementById('anime-watch-date').value = formatDateValue(entry.watchDate);
      document.getElementById('anime-progress').value = entry.progress || '';
      document.getElementById('anime-platform').value = entry.platform || '';
      document.getElementById('anime-favorite-character').value = entry.favoriteCharacter || '';
      document.getElementById('anime-tags').value = normalizeTags(entry.tags || []).join('，');
      document.getElementById('anime-favorite-scene').value = entry.favoriteScene || '';
      document.getElementById('anime-review').value = entry.review || entry.content || '';
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    window.setTimeout(() => document.getElementById('anime-title').focus(), 80);
  }

  function buildPayload(original) {
    const title = document.getElementById('anime-title').value.trim();
    const review = document.getElementById('anime-review').value.trim();
    const watchDate = formatDateValue(document.getElementById('anime-watch-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title,
      animeTitle: title,
      originalTitle: document.getElementById('anime-original-title').value.trim(),
      status: document.getElementById('anime-status').value,
      type: document.getElementById('anime-type').value,
      year: document.getElementById('anime-year').value.trim(),
      watchDate,
      progress: document.getElementById('anime-progress').value.trim(),
      platform: document.getElementById('anime-platform').value.trim(),
      favoriteCharacter: document.getElementById('anime-favorite-character').value.trim(),
      rating: parseInt(document.getElementById('anime-rating-value').value, 10) || 0,
      tags: normalizeTags(document.getElementById('anime-tags').value),
      favoriteScene: document.getElementById('anime-favorite-scene').value.trim(),
      review,
      content: review,
      date: watchDate || (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindToolbar() {
    ['anime-search', 'anime-filter-status', 'anime-filter-type', 'anime-filter-rating', 'anime-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'anime-search' ? 'input' : 'change', renderGarden);
    });
  }

  function bindRating() {
    document.querySelectorAll('.anime-petal').forEach((petal) => {
      petal.addEventListener('click', () => setRating(petal.dataset.value));
      petal.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRating(petal.dataset.value);
        }
      });
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const form = document.getElementById('input-form');
    const cancelBtn = document.getElementById('cancel-form');

    bindRating();
    bindToolbar();
    resetForm();
    loadEntries();

    addBtn.addEventListener('click', () => openForm());
    cancelBtn.addEventListener('click', closeForm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const title = document.getElementById('anime-title').value.trim();
      if (!title) {
        alert('请填写番剧名。');
        return;
      }

      const editId = form.dataset.editId;
      const original = entries.find((entry) => entry.id === editId);
      const payload = buildPayload(original);
      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;

      try {
        if (editId) {
          await window.PalaceDB.updateEntry(editId, payload);
        } else {
          await window.PalaceDB.createEntry(page, { ...payload, editCount: 0 });
        }
        await loadEntries();
        closeForm();
      } catch (error) {
        alert(error.message || '保存失败。');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
