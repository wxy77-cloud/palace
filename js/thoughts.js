(function () {
  'use strict';

  const page = 'thoughts';
  let entries = [];
  let filteredEntries = [];
  let activeEntryId = null;
  let activeEntry = null;

  const categoryNames = {
    maxim: '箴言',
    reflection: '感悟',
    idea: '灵感',
    question: '疑问',
    reminder: '提醒',
    quote: '摘录',
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
    return entry.title || entry.thoughtTitle || '未命名思考';
  }

  function getCategoryName(category) {
    return categoryNames[category] || '其他';
  }

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '✦'.repeat(value) + '·'.repeat(5 - value);
  }

  function getFilters() {
    return {
      search: document.getElementById('thought-search').value.trim().toLowerCase(),
      category: document.getElementById('thought-filter-category').value,
      rating: parseInt(document.getElementById('thought-filter-rating').value, 10) || 0,
      sort: document.getElementById('thought-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        getTitle(entry),
        entry.text,
        entry.reflection,
        entry.source,
        normalizeTags(entry.tags || []).join(' ')
      ].join(' ').toLowerCase();
      const rating = parseInt(entry.rating, 10) || 0;
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.category && (entry.category || 'other') !== filters.category) return false;
      if (filters.rating && rating < filters.rating) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return b.pinned ? 1 : -1;
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'date-desc') return String(b.recordedDate || '').localeCompare(String(a.recordedDate || ''));
      if (filters.sort === 'title-asc') return getTitle(a).localeCompare(getTitle(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="thoughts-modal" id="thoughts-modal" role="dialog" aria-modal="true" aria-labelledby="thoughts-modal-title">
        <div class="thoughts-modal__panel">
          <button class="thoughts-modal__close" id="thoughts-modal-close" type="button" aria-label="关闭">×</button>
          <div class="thoughts-modal__header">
            <span class="thoughts-modal__eyebrow">Inner Maxim</span>
            <h2 class="thoughts-modal__title" id="thoughts-modal-title"></h2>
            <p class="thoughts-modal__sub" id="thoughts-modal-sub"></p>
            <div class="thoughts-modal__rating" id="thoughts-modal-rating"></div>
          </div>
          <div class="thoughts-modal__body">
            <div class="thoughts-modal__meta" id="thoughts-modal-meta"></div>
            <blockquote class="thoughts-modal__text" id="thoughts-modal-text"></blockquote>
            <p class="thoughts-modal__reflection" id="thoughts-modal-reflection"></p>
            <div class="thoughts-modal__tags" id="thoughts-modal-tags"></div>
          </div>
          <div class="thoughts-modal__footer">
            <span id="thoughts-modal-edit-count"></span>
            <div class="thoughts-modal__actions">
              <button class="thoughts-modal__edit" id="thoughts-modal-edit" type="button">编辑</button>
              <button class="thoughts-modal__delete" id="thoughts-modal-delete" type="button">删除</button>
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
      container.innerHTML = `<div class="thoughts-empty"><p class="thoughts-empty__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="thoughts-empty">
          <div class="thoughts-empty__icon">✦</div>
          <p class="thoughts-empty__text">箴匣还空着，先收入一则值得记下的思考吧。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="thoughts-empty">
          <div class="thoughts-empty__icon">⌕</div>
          <p class="thoughts-empty__text">没有找到符合条件的箴言或感悟。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="thoughts-scrolls">
        ${filteredEntries.map((entry, index) => {
          const tags = normalizeTags(entry.tags || []);
          const category = entry.category || 'other';
          return `
            <article class="thought-card thought-card--${category}" data-id="${escapeHtml(entry.id)}" style="--delay: ${index * 36}ms;">
              <button class="thought-card__button" type="button">
                <span class="thought-card__category">${escapeHtml(getCategoryName(category))}</span>
                ${entry.pinned ? '<span class="thought-card__pin">置顶</span>' : ''}
                <h2 class="thought-card__title">${escapeHtml(getTitle(entry))}</h2>
                <p class="thought-card__text">${escapeHtml(entry.text || entry.content || '内容待补充')}</p>
                <p class="thought-card__source">${escapeHtml(entry.source || '来源未记录')}</p>
                <span class="thought-card__rating">${renderStars(entry.rating || 0)}</span>
                ${tags.length ? `<div class="thought-card__tags">${tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
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
    document.querySelectorAll('.thought-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.thought-card__button').addEventListener('click', () => {
        if (entry) openModal(entry);
      });
    });

    document.getElementById('thoughts-modal-close').addEventListener('click', closeModal);
    document.getElementById('thoughts-modal').addEventListener('click', (event) => {
      if (event.target.id === 'thoughts-modal') closeModal();
    });
    document.getElementById('thoughts-modal-edit').addEventListener('click', () => {
      if (!activeEntry) return;
      const entryToEdit = activeEntry;
      closeModal();
      openForm(entryToEdit);
    });
    document.getElementById('thoughts-modal-delete').addEventListener('click', deleteActiveEntry);
  }

  function openModal(entry) {
    activeEntryId = entry.id;
    activeEntry = entry;
    const tags = normalizeTags(entry.tags || []);
    const meta = [
      getCategoryName(entry.category),
      entry.source ? `来源 ${entry.source}` : '',
      entry.recordedDate ? `记录 ${entry.recordedDate}` : '',
      entry.pinned ? '置顶回看' : ''
    ].filter(Boolean);

    document.getElementById('thoughts-modal-title').textContent = getTitle(entry);
    document.getElementById('thoughts-modal-sub').textContent = [getCategoryName(entry.category), entry.source].filter(Boolean).join(' · ') || '灵犀箴匣';
    document.getElementById('thoughts-modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('thoughts-modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('thoughts-modal-text').textContent = entry.text || entry.content || '暂无正文';
    document.getElementById('thoughts-modal-reflection').textContent = entry.reflection || '暂无个人解读';
    document.getElementById('thoughts-modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('thoughts-modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
    document.getElementById('thoughts-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('thoughts-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    activeEntryId = null;
    activeEntry = null;
  }

  async function deleteActiveEntry() {
    if (!activeEntryId || !confirm('确定要从灵犀箴匣移除这则记录吗？')) return;
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
    document.getElementById('thought-rating').value = value;
    document.querySelectorAll('.thought-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.thoughts-form__title').textContent = '记录一则箴言或感悟';
    document.querySelector('.thoughts-submit-btn').textContent = '收入箴匣';
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
      document.querySelector('.thoughts-form__title').textContent = '修订这则箴言';
      document.querySelector('.thoughts-submit-btn').textContent = '保存修订';
      document.getElementById('thought-title').value = getTitle(entry);
      document.getElementById('thought-category').value = entry.category || 'other';
      document.getElementById('thought-source').value = entry.source || '';
      document.getElementById('thought-date').value = formatDateValue(entry.recordedDate);
      document.getElementById('thought-text').value = entry.text || entry.content || '';
      document.getElementById('thought-reflection').value = entry.reflection || '';
      document.getElementById('thought-pinned').checked = Boolean(entry.pinned);
      document.getElementById('thought-tags').value = normalizeTags(entry.tags || []).join('，');
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    document.getElementById('thought-title').focus();
  }

  function buildPayload(original) {
    const title = document.getElementById('thought-title').value.trim();
    const text = document.getElementById('thought-text').value.trim();
    const reflection = document.getElementById('thought-reflection').value.trim();
    const recordedDate = formatDateValue(document.getElementById('thought-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title,
      thoughtTitle: title,
      category: document.getElementById('thought-category').value,
      source: document.getElementById('thought-source').value.trim(),
      recordedDate,
      text,
      reflection,
      rating: parseInt(document.getElementById('thought-rating').value, 10) || 0,
      pinned: document.getElementById('thought-pinned').checked,
      tags: normalizeTags(document.getElementById('thought-tags').value),
      content: text,
      date: recordedDate || (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindInteractions() {
    document.querySelectorAll('.thought-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    ['thought-search', 'thought-filter-category', 'thought-filter-rating', 'thought-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'thought-search' ? 'input' : 'change', renderEntries);
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
      const title = document.getElementById('thought-title').value.trim();
      const text = document.getElementById('thought-text').value.trim();
      if (!title || !text) {
        alert('请填写标题和正文。');
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
