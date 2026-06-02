(function () {
  'use strict';

  const page = 'creators';
  let entries = [];
  let filteredEntries = [];
  let activeEntryId = null;
  let activeEntry = null;

  const typeNames = {
    video: '视频 / UP 主',
    writing: '文字 / 博主',
    art: '绘画 / 设计',
    fanwork: '同人 / 太太',
    knowledge: '知识 / 科普',
    life: '生活方式',
    music: '音乐 / 声音',
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
    return entry.name || entry.creatorName || entry.title || '未命名创作者';
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
      search: document.getElementById('creator-search').value.trim().toLowerCase(),
      type: document.getElementById('creator-filter-type').value,
      rating: parseInt(document.getElementById('creator-filter-rating').value, 10) || 0,
      sort: document.getElementById('creator-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        getName(entry),
        entry.platform,
        entry.works,
        entry.status,
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
      if (filters.sort === 'date-desc') return String(b.discoveredDate || '').localeCompare(String(a.discoveredDate || ''));
      if (filters.sort === 'name-asc') return getName(a).localeCompare(getName(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="creators-modal" id="creators-modal" role="dialog" aria-modal="true" aria-labelledby="creators-modal-title">
        <div class="creators-modal__panel">
          <button class="creators-modal__close" id="creators-modal-close" type="button" aria-label="关闭">×</button>
          <div class="creators-modal__header">
            <span class="creators-modal__eyebrow">Creator Dossier</span>
            <h2 class="creators-modal__title" id="creators-modal-title"></h2>
            <p class="creators-modal__sub" id="creators-modal-sub"></p>
            <div class="creators-modal__rating" id="creators-modal-rating"></div>
          </div>
          <div class="creators-modal__body">
            <div class="creators-modal__meta" id="creators-modal-meta"></div>
            <div class="creators-modal__works" id="creators-modal-works"></div>
            <div class="creators-modal__tags" id="creators-modal-tags"></div>
            <p class="creators-modal__notes" id="creators-modal-notes"></p>
          </div>
          <div class="creators-modal__footer">
            <span id="creators-modal-edit-count"></span>
            <div class="creators-modal__actions">
              <button class="creators-modal__visit" id="creators-modal-visit" type="button">打开主页</button>
              <button class="creators-modal__edit" id="creators-modal-edit" type="button">编辑</button>
              <button class="creators-modal__delete" id="creators-modal-delete" type="button">删除</button>
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
      container.innerHTML = `<div class="creators-empty"><p class="creators-empty__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="creators-empty">
          <div class="creators-empty__icon">✦</div>
          <p class="creators-empty__text">名帖还空着，先收入一位喜欢的创作者吧。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="creators-empty">
          <div class="creators-empty__icon">⌕</div>
          <p class="creators-empty__text">没有找到符合条件的创作者名帖。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="creators-board">
        ${filteredEntries.map((entry, index) => {
          const tags = normalizeTags(entry.tags || []);
          const type = entry.type || 'other';
          return `
            <article class="creator-card creator-card--${type}" data-id="${escapeHtml(entry.id)}" style="--delay: ${index * 36}ms;">
              <button class="creator-card__button" type="button">
                <span class="creator-card__sigil" aria-hidden="true">${escapeHtml(getName(entry).slice(0, 1))}</span>
                <span class="creator-card__type">${escapeHtml(getTypeName(type))}</span>
                <h2 class="creator-card__name">${escapeHtml(getName(entry))}</h2>
                <p class="creator-card__platform">${escapeHtml(entry.platform || '平台未记录')}</p>
                <p class="creator-card__works">${escapeHtml(entry.works || '代表作品待补充')}</p>
                <span class="creator-card__rating">${renderStars(entry.rating || 0)}</span>
                ${tags.length ? `<div class="creator-card__tags">${tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
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
    document.querySelectorAll('.creator-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.creator-card__button').addEventListener('click', () => {
        if (entry) openModal(entry);
      });
    });

    document.getElementById('creators-modal-close').addEventListener('click', closeModal);
    document.getElementById('creators-modal').addEventListener('click', (event) => {
      if (event.target.id === 'creators-modal') closeModal();
    });
    document.getElementById('creators-modal-edit').addEventListener('click', () => {
      if (!activeEntry) return;
      const entryToEdit = activeEntry;
      closeModal();
      openForm(entryToEdit);
    });
    document.getElementById('creators-modal-delete').addEventListener('click', deleteActiveEntry);
    document.getElementById('creators-modal-visit').addEventListener('click', () => {
      if (activeEntry && activeEntry.homepage) window.open(activeEntry.homepage, '_blank', 'noopener');
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
      entry.discoveredDate ? `发现 ${entry.discoveredDate}` : '',
      entry.homepage ? '有主页链接' : ''
    ].filter(Boolean);

    document.getElementById('creators-modal-title').textContent = getName(entry);
    document.getElementById('creators-modal-sub').textContent = [entry.platform, entry.status].filter(Boolean).join(' · ') || '创作者名帖';
    document.getElementById('creators-modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('creators-modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('creators-modal-works').textContent = entry.works ? `代表作品 / 频道亮点：${entry.works}` : '代表作品 / 频道亮点待补充';
    document.getElementById('creators-modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('creators-modal-notes').textContent = entry.notes || entry.content || '暂无喜欢原因';
    document.getElementById('creators-modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
    document.getElementById('creators-modal-visit').style.display = entry.homepage ? 'inline-flex' : 'none';
    document.getElementById('creators-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('creators-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    activeEntryId = null;
    activeEntry = null;
  }

  async function deleteActiveEntry() {
    if (!activeEntryId || !confirm('确定要从星河名帖移除这位创作者吗？')) return;
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
    document.getElementById('creator-rating').value = value;
    document.querySelectorAll('.creator-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.creators-form__title').textContent = '记录一位喜欢的创作者';
    document.querySelector('.creators-submit-btn').textContent = '收入名帖';
    document.getElementById('creator-status').value = '常看';
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
      document.querySelector('.creators-form__title').textContent = '修订这张名帖';
      document.querySelector('.creators-submit-btn').textContent = '保存修订';
      document.getElementById('creator-name').value = getName(entry);
      document.getElementById('creator-platform').value = entry.platform || '';
      document.getElementById('creator-type').value = entry.type || 'other';
      document.getElementById('creator-status').value = entry.status || '常看';
      document.getElementById('creator-homepage').value = entry.homepage || '';
      document.getElementById('creator-date').value = formatDateValue(entry.discoveredDate);
      document.getElementById('creator-works').value = entry.works || '';
      document.getElementById('creator-tags').value = normalizeTags(entry.tags || []).join('，');
      document.getElementById('creator-notes').value = entry.notes || entry.content || '';
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    document.getElementById('creator-name').focus();
  }

  function buildPayload(original) {
    const name = document.getElementById('creator-name').value.trim();
    const notes = document.getElementById('creator-notes').value.trim();
    const discoveredDate = formatDateValue(document.getElementById('creator-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title: name,
      name,
      creatorName: name,
      platform: document.getElementById('creator-platform').value.trim(),
      type: document.getElementById('creator-type').value,
      status: document.getElementById('creator-status').value,
      homepage: document.getElementById('creator-homepage').value.trim(),
      discoveredDate,
      rating: parseInt(document.getElementById('creator-rating').value, 10) || 0,
      works: document.getElementById('creator-works').value.trim(),
      tags: normalizeTags(document.getElementById('creator-tags').value),
      notes,
      content: notes,
      date: discoveredDate || (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindInteractions() {
    document.querySelectorAll('.creator-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    ['creator-search', 'creator-filter-type', 'creator-filter-rating', 'creator-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'creator-search' ? 'input' : 'change', renderEntries);
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
      const name = document.getElementById('creator-name').value.trim();
      if (!name) {
        alert('请填写创作者称呼。');
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
