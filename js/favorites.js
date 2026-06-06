(function () {
  'use strict';

  const page = 'favorites';
  let entries = [];
  let filteredEntries = [];
  let activeEntryId = null;
  let activeEntry = null;

  const typeNames = {
    character: '角色',
    hobby: '兴趣爱好',
    aesthetic: '审美 / 风格',
    object: '物品',
    place: '地点',
    theme: '主题 / 概念',
    comfort: '安慰物',
    other: '其他'
  };

  const favoritePatterns = [
    { key: 'moon-orbit', name: 'Moon', sigil: '☾', line: '' },
    { key: 'forest-antler', name: 'Antlers', sigil: '♈', line: '' },
    { key: 'solar-phoenix', name: 'Phoenix', sigil: '☼', line: '' },
    { key: 'rose-butterfly', name: 'Rose', sigil: '✧', line: '' },
    { key: 'frost-snow', name: 'Snowflake', sigil: '✶', line: '' },
    { key: 'raven-astrolabe', name: 'Raven', sigil: '◈', line: '' },
    { key: 'ocean-jelly', name: 'Jellyfish', sigil: '≈', line: '' },
    { key: 'lily-wings', name: 'Lily', sigil: '♢', line: '' }
  ];

  const legacyPatternMap = {
    'moon-garden': 'moon-orbit',
    'star-arch': 'moon-orbit',
    'rose-mirror': 'rose-butterfly',
    'crystal-vine': 'forest-antler',
    'mist-lake': 'ocean-jelly'
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

  function getTitle(entry) {
    return entry.title || entry.favoriteTitle || '未命名偏爱';
  }

  function getTypeName(type) {
    return typeNames[type] || '其他';
  }

  function getStableIndex(value) {
    const text = String(value || '');
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash % favoritePatterns.length;
  }

  function getRandomFavoritePattern() {
    return favoritePatterns[Math.floor(Math.random() * favoritePatterns.length)].key;
  }

  function getFavoritePattern(entry) {
    const key = entry && (entry.favoritePattern || entry.tarotPattern);
    const normalizedKey = legacyPatternMap[key] || key;
    return favoritePatterns.find((pattern) => pattern.key === normalizedKey) || favoritePatterns[getStableIndex(entry && (entry.id || entry.createdAt || getTitle(entry)))];
  }

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '✦'.repeat(value) + '·'.repeat(5 - value);
  }

  function getFilters() {
    return {
      search: document.getElementById('favorite-search').value.trim().toLowerCase(),
      type: document.getElementById('favorite-filter-type').value,
      rating: parseInt(document.getElementById('favorite-filter-rating').value, 10) || 0,
      sort: document.getElementById('favorite-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        getTitle(entry),
        entry.source,
        entry.reason || entry.content,
        normalizeTags(entry.tags || []).join(' ')
      ].join(' ').toLowerCase();
      const rating = parseInt(entry.rating, 10) || 0;
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.type && (entry.type || 'other') !== filters.type) return false;
      if (filters.rating && rating < filters.rating) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return b.pinned ? 1 : -1;
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'date-desc') return String(b.discoveredDate || '').localeCompare(String(a.discoveredDate || ''));
      if (filters.sort === 'title-asc') return getTitle(a).localeCompare(getTitle(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="favorites-modal" id="favorites-modal" role="dialog" aria-modal="true" aria-labelledby="favorites-modal-title">
        <div class="favorites-modal__panel">
          <button class="favorites-modal__close" id="favorites-modal-close" type="button" aria-label="关闭">×</button>
          <div class="favorites-modal__header">
            <span class="favorites-modal__eyebrow">Beloved Collection</span>
            <h2 class="favorites-modal__title" id="favorites-modal-title"></h2>
            <p class="favorites-modal__sub" id="favorites-modal-sub"></p>
            <div class="favorites-modal__rating" id="favorites-modal-rating"></div>
          </div>
          <div class="favorites-modal__body">
            <div class="favorites-modal__meta" id="favorites-modal-meta"></div>
            <p class="favorites-modal__reason" id="favorites-modal-reason"></p>
            <div class="favorites-modal__tags" id="favorites-modal-tags"></div>
          </div>
          <div class="favorites-modal__footer">
            <span id="favorites-modal-edit-count"></span>
            <div class="favorites-modal__actions">
              <button class="favorites-modal__visit" id="favorites-modal-visit" type="button">打开链接</button>
              <button class="favorites-modal__edit" id="favorites-modal-edit" type="button">编辑</button>
              <button class="favorites-modal__delete" id="favorites-modal-delete" type="button">删除</button>
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
      container.innerHTML = `<div class="favorites-empty"><p class="favorites-empty__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="favorites-empty">
          <div class="favorites-empty__icon">✦</div>
          <p class="favorites-empty__text">珍匣还空着，先收入一件喜欢的事物吧。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="favorites-empty">
          <div class="favorites-empty__icon">⌕</div>
          <p class="favorites-empty__text">没有找到符合条件的偏爱记录。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="favorites-case">
        ${filteredEntries.map((entry, index) => {
          const tags = normalizeTags(entry.tags || []);
          const type = entry.type || 'other';
          const pattern = getFavoritePattern(entry);
          return `
            <article class="favorite-card favorite-card--${type} favorite-card--pattern-${pattern.key}" data-id="${escapeHtml(entry.id)}" style="--delay: ${index * 36}ms;">
              <div class="favorite-card__button" role="button" tabindex="0" aria-pressed="false" aria-label="${escapeHtml(getTitle(entry))}">
                <div class="favorite-card__inner">
                  <div class="favorite-card__face favorite-card__face--front" aria-hidden="true">
                    <span class="favorite-art__mist"></span>
                    <span class="favorite-art__frame favorite-art__frame--outer"></span>
                    <span class="favorite-art__frame favorite-art__frame--inner"></span>
                    <span class="favorite-art__stars"></span>
                    <span class="favorite-art__halo"></span>
                    <span class="favorite-art__orbit"></span>
                    <span class="favorite-art__subject"></span>
                    <span class="favorite-art__vine favorite-art__vine--left"></span>
                    <span class="favorite-art__vine favorite-art__vine--right"></span>
                    <span class="favorite-card__pattern-title">${escapeHtml(pattern.name)}</span>
                    ${pattern.line ? `<span class="favorite-card__pattern-line">${escapeHtml(pattern.line)}</span>` : ''}
                  </div>
                  <div class="favorite-card__face favorite-card__face--back">
                    <span class="favorite-card__type">${escapeHtml(getTypeName(type))}</span>
                    ${entry.pinned ? '<span class="favorite-card__pin">置顶</span>' : ''}
                    <h2 class="favorite-card__title">${escapeHtml(getTitle(entry))}</h2>
                    <p class="favorite-card__source">${escapeHtml(entry.source || '来源未记录')}</p>
                    <p class="favorite-card__reason">${escapeHtml(entry.reason || entry.content || '喜欢原因待补充')}</p>
                    <span class="favorite-card__rating">${renderStars(entry.rating || 0)}</span>
                    ${tags.length ? `<div class="favorite-card__tags">${tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                    <button class="favorite-card__mist" type="button">拨开命运迷雾</button>
                  </div>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
      ${createModalHtml()}
    `;

    bindCardEvents();
  }

  function bindCardEvents() {
    document.querySelectorAll('.favorite-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      const button = card.querySelector('.favorite-card__button');
      const detailBtn = card.querySelector('.favorite-card__mist');

      button.addEventListener('click', () => {
        card.classList.toggle('is-flipped');
        button.setAttribute('aria-pressed', String(card.classList.contains('is-flipped')));
      });

      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        card.classList.toggle('is-flipped');
        button.setAttribute('aria-pressed', String(card.classList.contains('is-flipped')));
      });

      detailBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (entry) openModal(entry);
      });
    });

    document.getElementById('favorites-modal-close').addEventListener('click', closeModal);
    document.getElementById('favorites-modal').addEventListener('click', (event) => {
      if (event.target.id === 'favorites-modal') closeModal();
    });
    document.getElementById('favorites-modal-edit').addEventListener('click', () => {
      if (!activeEntry) return;
      const entryToEdit = activeEntry;
      closeModal();
      openForm(entryToEdit);
    });
    document.getElementById('favorites-modal-delete').addEventListener('click', deleteActiveEntry);
    document.getElementById('favorites-modal-visit').addEventListener('click', () => {
      if (activeEntry && activeEntry.link) window.open(activeEntry.link, '_blank', 'noopener');
    });
  }

  function openModal(entry) {
    activeEntryId = entry.id;
    activeEntry = entry;
    const tags = normalizeTags(entry.tags || []);
    const meta = [
      getTypeName(entry.type),
      entry.source,
      entry.discoveredDate ? `发现 ${entry.discoveredDate}` : '',
      entry.pinned ? '置顶偏爱' : '',
      entry.evergreen ? '长期喜欢' : '',
      entry.link ? '有相关链接' : ''
    ].filter(Boolean);

    document.getElementById('favorites-modal-title').textContent = getTitle(entry);
    document.getElementById('favorites-modal-sub').textContent = [getTypeName(entry.type), entry.source].filter(Boolean).join(' · ') || '偏爱珍匣';
    document.getElementById('favorites-modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('favorites-modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('favorites-modal-reason').textContent = entry.reason || entry.content || '暂无喜欢原因';
    document.getElementById('favorites-modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('favorites-modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
    document.getElementById('favorites-modal-visit').style.display = entry.link ? 'inline-flex' : 'none';
    document.getElementById('favorites-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('favorites-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    activeEntryId = null;
    activeEntry = null;
  }

  async function deleteActiveEntry() {
    if (!activeEntryId || !confirm('确定要从偏爱珍匣移除这件记录吗？')) return;
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
    document.getElementById('favorite-rating').value = value;
    document.querySelectorAll('.favorite-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.favorites-form__title').textContent = '记录一件偏爱的事物';
    document.querySelector('.favorites-submit-btn').textContent = '收入珍匣';
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
      document.querySelector('.favorites-form__title').textContent = '修订这件偏爱';
      document.querySelector('.favorites-submit-btn').textContent = '保存修订';
      document.getElementById('favorite-title').value = getTitle(entry);
      document.getElementById('favorite-type').value = entry.type || 'other';
      document.getElementById('favorite-source').value = entry.source || '';
      document.getElementById('favorite-date').value = formatDateValue(entry.discoveredDate);
      document.getElementById('favorite-pinned').checked = Boolean(entry.pinned);
      document.getElementById('favorite-evergreen').checked = Boolean(entry.evergreen);
      document.getElementById('favorite-reason').value = entry.reason || entry.content || '';
      document.getElementById('favorite-link').value = entry.link || '';
      document.getElementById('favorite-tags').value = normalizeTags(entry.tags || []).join('，');
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    document.getElementById('favorite-title').focus();
  }

  function buildPayload(original) {
    const title = document.getElementById('favorite-title').value.trim();
    const reason = document.getElementById('favorite-reason').value.trim();
    const discoveredDate = formatDateValue(document.getElementById('favorite-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title,
      favoriteTitle: title,
      type: document.getElementById('favorite-type').value,
      source: document.getElementById('favorite-source').value.trim(),
      discoveredDate,
      rating: parseInt(document.getElementById('favorite-rating').value, 10) || 0,
      pinned: document.getElementById('favorite-pinned').checked,
      evergreen: document.getElementById('favorite-evergreen').checked,
      reason,
      link: document.getElementById('favorite-link').value.trim(),
      tags: normalizeTags(document.getElementById('favorite-tags').value),
      favoritePattern: original ? getFavoritePattern(original).key : getRandomFavoritePattern(),
      content: reason,
      date: discoveredDate || (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindInteractions() {
    document.querySelectorAll('.favorite-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    ['favorite-search', 'favorite-filter-type', 'favorite-filter-rating', 'favorite-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'favorite-search' ? 'input' : 'change', renderEntries);
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
      const title = document.getElementById('favorite-title').value.trim();
      const reason = document.getElementById('favorite-reason').value.trim();
      if (!title || !reason) {
        alert('请填写名称和喜欢原因。');
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
