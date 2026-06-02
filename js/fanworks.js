(function () {
  'use strict';

  const page = 'fanworks';
  let entries = [];
  let filteredEntries = [];
  let activeEntryId = null;
  let activeEntry = null;

  const typeNames = {
    fic: '同人文',
    art: '同人图',
    comic: '漫画',
    video: '剪辑 / 视频',
    audio: '音频 / 广播剧',
    cos: 'Cosplay',
    meta: '考据 / 分析',
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

  function getTitle(entry) {
    return entry.title || entry.fanworkTitle || '未命名作品';
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
      search: document.getElementById('fanwork-search').value.trim().toLowerCase(),
      type: document.getElementById('fanwork-filter-type').value,
      rating: parseInt(document.getElementById('fanwork-filter-rating').value, 10) || 0,
      sort: document.getElementById('fanwork-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        getTitle(entry),
        entry.fandom,
        entry.creator,
        entry.platform,
        normalizeTags(entry.tags || []).join(' '),
        entry.review || entry.content
      ].join(' ').toLowerCase();
      const rating = parseInt(entry.rating, 10) || 0;
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.type && (entry.type || 'other') !== filters.type) return false;
      if (filters.rating && rating < filters.rating) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'date-desc') return String(b.discoveredDate || '').localeCompare(String(a.discoveredDate || ''));
      if (filters.sort === 'title-asc') return getTitle(a).localeCompare(getTitle(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="fanworks-modal" id="fanworks-modal" role="dialog" aria-modal="true" aria-labelledby="fanworks-modal-title">
        <div class="fanworks-modal__panel">
          <button class="fanworks-modal__close" id="fanworks-modal-close" type="button" aria-label="关闭">×</button>
          <div class="fanworks-modal__header">
            <span class="fanworks-modal__eyebrow">Parallel Universe</span>
            <h2 class="fanworks-modal__title" id="fanworks-modal-title"></h2>
            <p class="fanworks-modal__sub" id="fanworks-modal-sub"></p>
            <div class="fanworks-modal__rating" id="fanworks-modal-rating"></div>
          </div>
          <div class="fanworks-modal__body">
            <div class="fanworks-modal__meta" id="fanworks-modal-meta"></div>
            <div class="fanworks-modal__tags" id="fanworks-modal-tags"></div>
            <p class="fanworks-modal__review" id="fanworks-modal-review"></p>
          </div>
          <div class="fanworks-modal__footer">
            <span id="fanworks-modal-edit-count"></span>
            <div class="fanworks-modal__actions">
              <button class="fanworks-modal__visit" id="fanworks-modal-visit" type="button">打开链接</button>
              <button class="fanworks-modal__edit" id="fanworks-modal-edit" type="button">编辑</button>
              <button class="fanworks-modal__delete" id="fanworks-modal-delete" type="button">删除</button>
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
      container.innerHTML = `<div class="fanworks-empty"><p class="fanworks-empty__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="fanworks-empty">
          <div class="fanworks-empty__icon">🪞</div>
          <p class="fanworks-empty__text">陈列馆还空着，收入第一件喜欢的同人作品吧。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="fanworks-empty">
          <div class="fanworks-empty__icon">⌕</div>
          <p class="fanworks-empty__text">没有找到符合条件的平行宇宙藏品。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="fanworks-cabinet">
        ${filteredEntries.map((entry, index) => {
          const tags = normalizeTags(entry.tags || []);
          const type = entry.type || 'other';
          return `
            <article class="fanwork-card fanwork-card--${type}" data-id="${escapeHtml(entry.id)}" style="--delay: ${index * 40}ms;">
              <button class="fanwork-card__button" type="button">
                <span class="fanwork-card__mirror" aria-hidden="true"></span>
                <span class="fanwork-card__type">${escapeHtml(getTypeName(type))}</span>
                <h2 class="fanwork-card__title">${escapeHtml(getTitle(entry))}</h2>
                <p class="fanwork-card__fandom">${escapeHtml(entry.fandom || '原作未记录')}</p>
                <p class="fanwork-card__creator">${escapeHtml(entry.creator || '创作者未记录')}</p>
                <span class="fanwork-card__rating">${renderStars(entry.rating || 0)}</span>
                ${tags.length ? `<div class="fanwork-card__tags">${tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
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
    document.querySelectorAll('.fanwork-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.fanwork-card__button').addEventListener('click', () => {
        if (entry) openModal(entry);
      });
    });

    document.getElementById('fanworks-modal-close').addEventListener('click', closeModal);
    document.getElementById('fanworks-modal').addEventListener('click', (event) => {
      if (event.target.id === 'fanworks-modal') closeModal();
    });
    document.getElementById('fanworks-modal-edit').addEventListener('click', () => {
      if (!activeEntry) return;
      const entryToEdit = activeEntry;
      closeModal();
      openForm(entryToEdit);
    });
    document.getElementById('fanworks-modal-delete').addEventListener('click', deleteActiveEntry);
    document.getElementById('fanworks-modal-visit').addEventListener('click', () => {
      if (activeEntry && activeEntry.link) window.open(activeEntry.link, '_blank', 'noopener');
    });
  }

  function openModal(entry) {
    activeEntryId = entry.id;
    activeEntry = entry;
    const tags = normalizeTags(entry.tags || []);
    const meta = [
      getTypeName(entry.type),
      entry.status,
      entry.platform,
      entry.discoveredDate ? `邂逅 ${entry.discoveredDate}` : '',
      entry.link ? '有链接' : ''
    ].filter(Boolean);

    document.getElementById('fanworks-modal-title').textContent = getTitle(entry);
    document.getElementById('fanworks-modal-sub').textContent = [entry.fandom, entry.creator].filter(Boolean).join(' · ') || '平行宇宙藏品';
    document.getElementById('fanworks-modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('fanworks-modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('fanworks-modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('fanworks-modal-review').textContent = entry.review || entry.content || '暂无收藏理由';
    document.getElementById('fanworks-modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
    document.getElementById('fanworks-modal-visit').style.display = entry.link ? 'inline-flex' : 'none';
    document.getElementById('fanworks-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('fanworks-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    activeEntryId = null;
    activeEntry = null;
  }

  async function deleteActiveEntry() {
    if (!activeEntryId || !confirm('确定要从陈列馆移除这件作品吗？')) return;
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
    document.getElementById('fanwork-rating').value = value;
    document.querySelectorAll('.fanwork-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.fanworks-form__title').textContent = '记录一件同人作品';
    document.querySelector('.fanworks-submit-btn').textContent = '放入陈列馆';
    document.getElementById('fanwork-status').value = '已看完';
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
      document.querySelector('.fanworks-form__title').textContent = '修订这件藏品';
      document.querySelector('.fanworks-submit-btn').textContent = '保存修订';
      document.getElementById('fanwork-title').value = getTitle(entry);
      document.getElementById('fanwork-fandom').value = entry.fandom || '';
      document.getElementById('fanwork-creator').value = entry.creator || '';
      document.getElementById('fanwork-type').value = entry.type || 'other';
      document.getElementById('fanwork-platform').value = entry.platform || '';
      document.getElementById('fanwork-link').value = entry.link || '';
      document.getElementById('fanwork-date').value = formatDateValue(entry.discoveredDate);
      document.getElementById('fanwork-status').value = entry.status || '已看完';
      document.getElementById('fanwork-tags').value = normalizeTags(entry.tags || []).join('，');
      document.getElementById('fanwork-review').value = entry.review || entry.content || '';
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    document.getElementById('fanwork-title').focus();
  }

  function buildPayload(original) {
    const title = document.getElementById('fanwork-title').value.trim();
    const review = document.getElementById('fanwork-review').value.trim();
    const discoveredDate = formatDateValue(document.getElementById('fanwork-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title,
      fanworkTitle: title,
      fandom: document.getElementById('fanwork-fandom').value.trim(),
      creator: document.getElementById('fanwork-creator').value.trim(),
      type: document.getElementById('fanwork-type').value,
      platform: document.getElementById('fanwork-platform').value.trim(),
      link: document.getElementById('fanwork-link').value.trim(),
      discoveredDate,
      status: document.getElementById('fanwork-status').value,
      rating: parseInt(document.getElementById('fanwork-rating').value, 10) || 0,
      tags: normalizeTags(document.getElementById('fanwork-tags').value),
      review,
      content: review,
      date: discoveredDate || (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindInteractions() {
    document.querySelectorAll('.fanwork-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    ['fanwork-search', 'fanwork-filter-type', 'fanwork-filter-rating', 'fanwork-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'fanwork-search' ? 'input' : 'change', renderEntries);
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
      const title = document.getElementById('fanwork-title').value.trim();
      if (!title) {
        alert('请填写作品名称。');
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
        closeForm();
        await renderEntries();
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
