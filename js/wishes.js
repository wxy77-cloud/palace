(function () {
  'use strict';

  const page = 'wishes';
  let entries = [];
  let filteredEntries = [];
  let activeEntryId = null;
  let activeEntry = null;

  const typeNames = {
    life: '生活愿望',
    travel: '旅行妄想',
    career: '事业 / 学习',
    creation: '创作计划',
    purchase: '想买清单',
    relationship: '关系与陪伴',
    fantasy: '纯粹妄想',
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
    if (value === '长相守') return '';
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
    return entry.title || entry.wishTitle || '未命名愿望';
  }

  function getTypeName(type) {
    return typeNames[type] || '其他';
  }

  function isForeverTarget(entry) {
    return entry && (entry.targetDateMode === 'forever' || entry.targetDate === '长相守');
  }

  function getTargetLabel(entry) {
    if (isForeverTarget(entry)) return '长相守';
    return entry.targetDate || '';
  }

  function getTargetSortValue(entry) {
    if (isForeverTarget(entry) || !entry.targetDate) return '9999-12-31';
    return String(entry.targetDate);
  }

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '✦'.repeat(value) + '·'.repeat(5 - value);
  }

  function getFilters() {
    return {
      search: document.getElementById('wish-search').value.trim().toLowerCase(),
      type: document.getElementById('wish-filter-type').value,
      status: document.getElementById('wish-filter-status').value,
      sort: document.getElementById('wish-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = [
        getTitle(entry),
        entry.detail,
        entry.nextStep,
        entry.status,
        normalizeTags(entry.tags || []).join(' ')
      ].join(' ').toLowerCase();
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.type && (entry.type || 'other') !== filters.type) return false;
      if (filters.status && entry.status !== filters.status) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return b.pinned ? 1 : -1;
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'date-asc') return getTargetSortValue(a).localeCompare(getTargetSortValue(b));
      if (filters.sort === 'title-asc') return getTitle(a).localeCompare(getTitle(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="wishes-modal" id="wishes-modal" role="dialog" aria-modal="true" aria-labelledby="wishes-modal-title">
        <div class="wishes-modal__panel">
          <button class="wishes-modal__close" id="wishes-modal-close" type="button" aria-label="关闭">×</button>
          <div class="wishes-modal__header">
            <span class="wishes-modal__eyebrow">Wish Vault</span>
            <h2 class="wishes-modal__title" id="wishes-modal-title"></h2>
            <p class="wishes-modal__sub" id="wishes-modal-sub"></p>
            <div class="wishes-modal__rating" id="wishes-modal-rating"></div>
          </div>
          <div class="wishes-modal__body">
            <div class="wishes-modal__meta" id="wishes-modal-meta"></div>
            <p class="wishes-modal__detail" id="wishes-modal-detail"></p>
            <p class="wishes-modal__next" id="wishes-modal-next"></p>
            <div class="wishes-modal__tags" id="wishes-modal-tags"></div>
          </div>
          <div class="wishes-modal__footer">
            <span id="wishes-modal-edit-count"></span>
            <div class="wishes-modal__actions">
              <button class="wishes-modal__edit" id="wishes-modal-edit" type="button">编辑</button>
              <button class="wishes-modal__delete" id="wishes-modal-delete" type="button">删除</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function equalizeWishCards() {
    const cards = Array.from(document.querySelectorAll('.wish-card'));
    if (!cards.length) return;

    cards.forEach((card) => {
      const button = card.querySelector('.wish-card__button');
      card.style.height = 'auto';
      if (button) button.style.height = 'auto';
    });

    const maxHeight = Math.max(...cards.map((card) => Math.ceil(card.getBoundingClientRect().height)));
    cards.forEach((card) => {
      const button = card.querySelector('.wish-card__button');
      card.style.height = `${maxHeight}px`;
      if (button) button.style.height = '100%';
    });
  }

  async function renderEntries() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      container.innerHTML = `<div class="wishes-empty"><p class="wishes-empty__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="wishes-empty">
          <div class="wishes-empty__icon">✦</div>
          <p class="wishes-empty__text">星匣还空着，先收入一个愿望或妄想吧。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="wishes-empty">
          <div class="wishes-empty__icon">⌕</div>
          <p class="wishes-empty__text">没有找到符合条件的愿望。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="wishes-vault">
        ${filteredEntries.map((entry, index) => {
          const tags = normalizeTags(entry.tags || []);
          const type = entry.type || 'other';
          const targetLabel = getTargetLabel(entry);
          return `
            <article class="wish-card wish-card--${type}" data-id="${escapeHtml(entry.id)}" style="--delay: ${index * 36}ms;">
              <button class="wish-card__button" type="button">
                <span class="wish-card__orb" aria-hidden="true"></span>
                <span class="wish-card__type">${escapeHtml(getTypeName(type))}</span>
                ${entry.pinned ? '<span class="wish-card__pin">置顶</span>' : ''}
                <h2 class="wish-card__title">${escapeHtml(getTitle(entry))}</h2>
                <p class="wish-card__detail">${escapeHtml(entry.detail || entry.content || '愿望详情待补充')}</p>
                <p class="wish-card__status">${escapeHtml(entry.status || '状态未记录')}${targetLabel ? ` · ${escapeHtml(targetLabel)}` : ''}</p>
                <span class="wish-card__rating">${renderStars(entry.rating || 0)}</span>
                ${tags.length ? `<div class="wish-card__tags">${tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
              </button>
            </article>
          `;
        }).join('')}
      </div>
      ${createModalHtml()}
    `;

    bindCardEvents();
    requestAnimationFrame(equalizeWishCards);
  }

  function bindCardEvents() {
    document.querySelectorAll('.wish-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.wish-card__button').addEventListener('click', () => {
        if (entry) openModal(entry);
      });
    });

    document.getElementById('wishes-modal-close').addEventListener('click', closeModal);
    document.getElementById('wishes-modal').addEventListener('click', (event) => {
      if (event.target.id === 'wishes-modal') closeModal();
    });
    document.getElementById('wishes-modal-edit').addEventListener('click', () => {
      if (!activeEntry) return;
      const entryToEdit = activeEntry;
      closeModal();
      openForm(entryToEdit);
    });
    document.getElementById('wishes-modal-delete').addEventListener('click', deleteActiveEntry);
  }

  function openModal(entry) {
    activeEntryId = entry.id;
    activeEntry = entry;
    const tags = normalizeTags(entry.tags || []);
    const targetLabel = getTargetLabel(entry);
    const meta = [
      getTypeName(entry.type),
      entry.status,
      targetLabel ? `目标 ${targetLabel}` : '',
      entry.pinned ? '置顶想望' : '',
      entry.privateWish ? '秘密妄想' : ''
    ].filter(Boolean);

    document.getElementById('wishes-modal-title').textContent = getTitle(entry);
    document.getElementById('wishes-modal-sub').textContent = [getTypeName(entry.type), entry.status].filter(Boolean).join(' · ') || '妄想星匣';
    document.getElementById('wishes-modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('wishes-modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('wishes-modal-detail').textContent = entry.detail || entry.content || '暂无愿望详情';
    document.getElementById('wishes-modal-next').textContent = entry.nextStep ? `下一小步：${entry.nextStep}` : '下一小步暂未记录';
    document.getElementById('wishes-modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('wishes-modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
    document.getElementById('wishes-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('wishes-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    activeEntryId = null;
    activeEntry = null;
  }

  async function deleteActiveEntry() {
    if (!activeEntryId || !confirm('确定要从妄想星匣移除这个愿望吗？')) return;
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
    document.getElementById('wish-rating').value = value;
    document.querySelectorAll('.wish-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function setTargetDateMode(mode) {
    const isDateMode = mode === 'date';
    const dateMode = document.getElementById('wish-date-mode');
    const dateInput = document.getElementById('wish-date');
    dateMode.value = isDateMode ? 'date' : 'forever';
    dateInput.disabled = !isDateMode;
    dateInput.required = isDateMode;
    if (!isDateMode) dateInput.value = '';
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.wishes-form__title').textContent = '记录一个愿望或妄想';
    document.querySelector('.wishes-submit-btn').textContent = '收入星匣';
    document.getElementById('wish-status').value = '萌芽';
    setTargetDateMode('forever');
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
      document.querySelector('.wishes-form__title').textContent = '修订这颗想望';
      document.querySelector('.wishes-submit-btn').textContent = '保存修订';
      document.getElementById('wish-title').value = getTitle(entry);
      document.getElementById('wish-type').value = entry.type || 'other';
      document.getElementById('wish-status').value = entry.status || '萌芽';
      setTargetDateMode(isForeverTarget(entry) || !entry.targetDate ? 'forever' : 'date');
      document.getElementById('wish-date').value = formatDateValue(entry.targetDate);
      document.getElementById('wish-pinned').checked = Boolean(entry.pinned);
      document.getElementById('wish-private').checked = Boolean(entry.privateWish);
      document.getElementById('wish-detail').value = entry.detail || entry.content || '';
      document.getElementById('wish-next-step').value = entry.nextStep || '';
      document.getElementById('wish-tags').value = normalizeTags(entry.tags || []).join('，');
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    document.getElementById('wish-title').focus();
  }

  function buildPayload(original) {
    const title = document.getElementById('wish-title').value.trim();
    const detail = document.getElementById('wish-detail').value.trim();
    const targetDateMode = document.getElementById('wish-date-mode').value === 'date' ? 'date' : 'forever';
    const targetDate = targetDateMode === 'forever' ? '长相守' : formatDateValue(document.getElementById('wish-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title,
      wishTitle: title,
      type: document.getElementById('wish-type').value,
      status: document.getElementById('wish-status').value,
      targetDateMode,
      targetDate,
      rating: parseInt(document.getElementById('wish-rating').value, 10) || 0,
      pinned: document.getElementById('wish-pinned').checked,
      privateWish: document.getElementById('wish-private').checked,
      detail,
      nextStep: document.getElementById('wish-next-step').value.trim(),
      tags: normalizeTags(document.getElementById('wish-tags').value),
      content: detail,
      date: targetDateMode === 'date' && targetDate ? targetDate : (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindInteractions() {
    document.querySelectorAll('.wish-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    ['wish-search', 'wish-filter-type', 'wish-filter-status', 'wish-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'wish-search' ? 'input' : 'change', renderEntries);
    });

    document.getElementById('wish-date-mode').addEventListener('change', (event) => {
      setTargetDateMode(event.target.value);
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const form = document.getElementById('input-form');
    const cancelBtn = document.getElementById('cancel-form');

    bindInteractions();
    renderEntries();

    window.addEventListener('resize', () => {
      requestAnimationFrame(equalizeWishCards);
    });

    addBtn.addEventListener('click', () => openForm());
    cancelBtn.addEventListener('click', closeForm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const title = document.getElementById('wish-title').value.trim();
      const detail = document.getElementById('wish-detail').value.trim();
      if (!title || !detail) {
        alert('请填写愿望名称和详情。');
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
