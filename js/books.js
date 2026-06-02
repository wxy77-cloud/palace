(function () {
  'use strict';

  const page = 'books';
  let currentEntryId = null;
  let entries = [];
  let filteredEntries = [];
  let activeModalEntry = null;

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDateValue(value) {
    if (!value || value === '未记录') return '';
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

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  function getDisplayTitle(entry) {
    return entry.title || entry.bookTitle || '未命名书籍';
  }

  function getTypeName(type) {
    const typeNames = {
      fantasy: '奇幻魔法',
      science: '科幻探索',
      mystery: '悬疑推理',
      fiction: '文学小说',
      history: '历史传记',
      philosophy: '哲学思考',
      'self-help': '自我成长',
      poetry: '诗歌散文',
      other: '其他'
    };
    return typeNames[type] || '';
  }

  function calculateSpineWidth(title) {
    const len = String(title || '').length;
    if (len <= 3) return 38;
    if (len <= 5) return 44;
    if (len <= 8) return 50;
    if (len <= 12) return 58;
    return 66;
  }

  function getSpineColor(entry) {
    const rating = parseInt(entry.rating, 10) || 0;
    const bookType = entry.type || entry.bookType || '';

    const typeColorMap = {
      fantasy: ['stardust', 'nebula', 'moonstone', 'gold'],
      science: ['cosmic-blue', 'galaxy', 'aurora', 'teal'],
      mystery: ['midnight', 'shadow-purple', 'violet-mist', 'burgundy'],
      fiction: ['lavender', 'rose-gold', 'forest', 'plum'],
      history: ['antique-gold', 'parchment', 'sage', 'amber'],
      philosophy: ['silver-mist', 'ash', 'dusty-lavender', 'slate'],
      'self-help': ['sunrise', 'peach', 'sage', 'mint'],
      poetry: ['dream-pink', 'lilac', 'amethyst', 'rose-quartz'],
      other: ['starlight', 'cosmic-purple', 'twilight', 'mist']
    };

    const colorsByRating = {
      5: ['stardust', 'gold', 'aurora', 'moonstone'],
      4: ['nebula', 'midnight', 'cosmic-blue', 'amethyst'],
      3: ['lavender', 'lilac', 'galaxy', 'rose-gold'],
      2: ['sage', 'peach', 'parchment', 'slate'],
      1: ['ash', 'silver-mist', 'dusty-lavender', 'mist']
    };

    const availableColors = typeColorMap[bookType] || colorsByRating[rating] || colorsByRating[3];
    let hash = 0;
    getDisplayTitle(entry).split('').forEach((char) => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    return availableColors[Math.abs(hash) % availableColors.length];
  }

  function getBookLean(index) {
    const leans = [-2.2, 0.9, -0.7, 1.6, -1.2, 0.4, 2.1, -0.4, 1.3];
    return leans[index % leans.length];
  }

  function getBookHeight(row, index, entry) {
    const ratingBoost = Math.max(0, Math.min(5, parseInt(entry.rating, 10) || 0)) * 2;
    return 148 + ((row * 9 + index) % 7) * 7 + ratingBoost;
  }

  function getBooksPerRow() {
    const width = window.innerWidth;
    if (width < 420) return 4;
    if (width < 640) return 5;
    if (width < 860) return 7;
    return 9;
  }

  function renderShelfDecor(rowBooks, row) {
    const decorTypes = ['candle', 'crystal', 'vase', 'stack', 'scroll'];
    if (rowBooks.length >= getBooksPerRow() - 1) return row % 3 === 0 ? '<div class="shelf-object shelf-object--bookend" aria-hidden="true"></div>' : '';

    const decor = decorTypes[row % decorTypes.length];
    return `<div class="shelf-object shelf-object--${decor}" aria-hidden="true"></div>`;
  }

  function getFilters() {
    return {
      search: document.getElementById('book-search').value.trim().toLowerCase(),
      type: document.getElementById('book-filter-type').value,
      rating: parseInt(document.getElementById('book-filter-rating').value, 10) || 0,
      sort: document.getElementById('book-sort').value
    };
  }

  function applyFilters() {
    const filters = getFilters();
    filteredEntries = entries.filter((entry) => {
      const haystack = `${getDisplayTitle(entry)} ${entry.author || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
      const rating = parseInt(entry.rating, 10) || 0;
      if (filters.search && !haystack.includes(filters.search)) return false;
      if (filters.type && (entry.type || entry.bookType || '') !== filters.type) return false;
      if (filters.rating && rating < filters.rating) return false;
      return true;
    });

    filteredEntries.sort((a, b) => {
      if (filters.sort === 'rating-desc') return (parseInt(b.rating, 10) || 0) - (parseInt(a.rating, 10) || 0);
      if (filters.sort === 'read-desc') return String(b.readDate || '').localeCompare(String(a.readDate || ''));
      if (filters.sort === 'title-asc') return getDisplayTitle(a).localeCompare(getDisplayTitle(b), 'zh-CN');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function createModalHtml() {
    return `
      <div class="book-modal" id="book-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="book-modal__content">
          <button class="book-modal__close" id="modal-close" type="button" aria-label="关闭">×</button>
          <div class="book-modal__spread">
            <section class="book-modal__page book-modal__page--left">
              <span class="book-modal__label">学院藏书票</span>
              <h2 class="book-modal__title" id="modal-title"></h2>
              <p class="book-modal__author" id="modal-author"></p>
              <span class="book-modal__type" id="modal-type"></span>
              <div class="book-modal__meta" id="modal-meta"></div>
              <div class="book-modal__tags" id="modal-tags"></div>
            </section>
            <section class="book-modal__page book-modal__page--right">
              <span class="book-modal__label">读书笔记</span>
              <div class="book-modal__quote" id="modal-quote"></div>
              <div class="book-modal__review" id="modal-review"></div>
              <div class="book-modal__footer">
                <span class="book-modal__edit-count" id="modal-edit-count"></span>
                <div class="book-modal__actions">
                  <button class="book-modal__edit" id="modal-edit-btn" type="button">编辑藏书票</button>
                  <button class="book-modal__delete" id="modal-delete-btn" type="button">删除</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function renderShelf() {
    const container = document.getElementById('entries-container');
    if (!container) return;
    applyFilters();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="bookshelf-empty">
          <div class="bookshelf-empty__icon">📚</div>
          <p class="bookshelf-empty__text">书架暂时空着，添加第一本书吧。</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      container.innerHTML = `
        <div class="bookshelf-empty">
          <div class="bookshelf-empty__icon">⌕</div>
          <p class="bookshelf-empty__text">目录里没有找到符合条件的书。</p>
        </div>
      `;
      return;
    }

    const booksPerRow = getBooksPerRow();
    const minShelfRows = 3;
    const rowCount = Math.max(minShelfRows, Math.ceil(filteredEntries.length / booksPerRow));
    let html = `
      <div class="library-cabinet" aria-label="读过的书架">
        <div class="library-cabinet__crown">纸间藏书阁</div>
        <div class="bookshelf" style="--books-per-row: ${booksPerRow};">
    `;

    for (let row = 0; row < rowCount; row += 1) {
      const rowBooks = filteredEntries.slice(row * booksPerRow, (row + 1) * booksPerRow);
      html += `<div class="bookshelf-row ${rowBooks.length === 0 ? 'bookshelf-row--empty' : ''}">`;
      html += '<div class="shelf-bookend shelf-bookend--left" aria-hidden="true"></div>';

      rowBooks.forEach((entry, index) => {
        const title = getDisplayTitle(entry);
        const spineWidth = calculateSpineWidth(title);
        const spineColor = getSpineColor(entry);
        const height = getBookHeight(row, index, entry);
        const lean = getBookLean(row * booksPerRow + index);
        const rating = parseInt(entry.rating, 10) || 0;

        html += `
          <button class="book-spine book-spine--${spineColor} book-spine--rating-${rating}"
                  style="width: ${spineWidth}px; height: ${height}px; --lean: ${lean}deg;"
                  data-id="${escapeHtml(entry.id)}"
                  type="button"
                  title="${escapeHtml(title)}">
            <span class="book-spine__cap" aria-hidden="true"></span>
            <span class="book-spine__title">${escapeHtml(title)}</span>
            <span class="book-spine__bottom" aria-hidden="true"></span>
          </button>
        `;
      });

      html += renderShelfDecor(rowBooks, row);
      html += '<div class="shelf-bookend shelf-bookend--right" aria-hidden="true"></div>';
      html += '</div>';
    }

    html += '</div></div>';
    html += createModalHtml();
    container.innerHTML = html;
    bindShelfEvents();
  }

  async function loadEntries() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
      renderShelf();
    } catch (error) {
      container.innerHTML = `<div class="bookshelf-empty"><p>${escapeHtml(error.message || '加载失败。')}</p></div>`;
    }
  }

  function bindShelfEvents() {
    document.querySelectorAll('.book-spine').forEach((spine) => {
      spine.addEventListener('click', () => {
        const entry = entries.find((item) => item.id === spine.dataset.id);
        if (entry) openModal(entry);
      });
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('book-modal').addEventListener('click', (event) => {
      if (event.target.id === 'book-modal') closeModal();
    });
    document.getElementById('modal-edit-btn').addEventListener('click', () => {
      if (activeModalEntry) {
        closeModal();
        openForm(activeModalEntry);
      }
    });
    document.getElementById('modal-delete-btn').addEventListener('click', deleteCurrentEntry);
  }

  function openModal(entry) {
    currentEntryId = entry.id;
    activeModalEntry = entry;
    const tags = normalizeTags(entry.tags || []);
    const meta = [
      renderStars(entry.rating || 0),
      entry.status || '状态未记录',
      entry.readDate ? `完成 ${entry.readDate}` : '',
      entry.startDate ? `开始 ${entry.startDate}` : '',
      entry.publisher ? `版本 ${entry.publisher}` : '',
      entry.source ? `来源 ${entry.source}` : '',
      entry.reread ? '想重读' : ''
    ].filter(Boolean);

    document.getElementById('modal-title').textContent = getDisplayTitle(entry);
    document.getElementById('modal-author').textContent = entry.author || '未知作者';
    document.getElementById('modal-meta').innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    document.getElementById('modal-review').textContent = entry.review || entry.content || '暂无书评';
    document.getElementById('modal-quote').textContent = entry.quote ? `“${entry.quote}”` : '';
    document.getElementById('modal-tags').innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;

    const typeSpan = document.getElementById('modal-type');
    const typeName = getTypeName(entry.type);
    typeSpan.textContent = typeName ? `【${typeName}】` : '';
    typeSpan.style.display = typeName ? 'inline' : 'none';

    document.getElementById('book-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('book-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    currentEntryId = null;
    activeModalEntry = null;
  }

  async function deleteCurrentEntry() {
    if (!currentEntryId || !confirm('确定要删除这本书吗？')) return;
    try {
      await window.PalaceDB.deleteEntry(currentEntryId);
      closeModal();
      await loadEntries();
    } catch (error) {
      alert(error.message || '删除失败。');
    }
  }

  function setRating(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    document.getElementById('book-rating').value = value;
    document.querySelectorAll('.star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelector('.book-form__title').textContent = '记录一本读过的书';
    document.querySelector('.book-submit-btn').textContent = '放入书架';
    document.getElementById('book-status').value = '读完';
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
      document.querySelector('.book-form__title').textContent = '修订这张藏书票';
      document.querySelector('.book-submit-btn').textContent = '保存修订';
      document.getElementById('book-title').value = getDisplayTitle(entry);
      document.getElementById('book-author').value = entry.author || '';
      document.getElementById('book-type').value = entry.type || '';
      document.getElementById('book-status').value = entry.status || '读完';
      document.getElementById('book-start-date').value = formatDateValue(entry.startDate);
      document.getElementById('book-date').value = formatDateValue(entry.readDate);
      document.getElementById('book-publisher').value = entry.publisher || '';
      document.getElementById('book-source').value = entry.source || '';
      document.getElementById('book-tags').value = normalizeTags(entry.tags || []).join('，');
      document.getElementById('book-reread').checked = Boolean(entry.reread);
      document.getElementById('book-quote').value = entry.quote || '';
      document.getElementById('book-review').value = entry.review || entry.content || '';
      setRating(entry.rating || 0);
    } else {
      resetForm();
    }

    window.setTimeout(() => document.getElementById('book-title').focus(), 80);
  }

  function buildPayload(original) {
    const title = document.getElementById('book-title').value.trim();
    const review = document.getElementById('book-review').value.trim();
    const readDate = formatDateValue(document.getElementById('book-date').value);
    const now = new Date();

    return {
      ...(original || {}),
      title,
      bookTitle: title,
      author: document.getElementById('book-author').value.trim(),
      type: document.getElementById('book-type').value,
      status: document.getElementById('book-status').value,
      startDate: formatDateValue(document.getElementById('book-start-date').value),
      readDate,
      publisher: document.getElementById('book-publisher').value.trim(),
      source: document.getElementById('book-source').value.trim(),
      tags: normalizeTags(document.getElementById('book-tags').value),
      reread: document.getElementById('book-reread').checked,
      quote: document.getElementById('book-quote').value.trim(),
      rating: parseInt(document.getElementById('book-rating').value, 10) || 0,
      review,
      content: review,
      date: readDate || (original ? original.date : formatDateValue(now)),
      createdAt: original ? original.createdAt : now.toISOString()
    };
  }

  function bindToolbar() {
    ['book-search', 'book-filter-type', 'book-filter-rating', 'book-sort'].forEach((id) => {
      const control = document.getElementById(id);
      control.addEventListener(id === 'book-search' ? 'input' : 'change', renderShelf);
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(renderShelf, 160);
    });
  }

  function initStarRating() {
    document.querySelectorAll('.star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
      star.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRating(star.dataset.value);
        }
      });
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const form = document.getElementById('input-form');
    const cancelFormBtn = document.getElementById('cancel-form');

    initStarRating();
    bindToolbar();
    resetForm();
    loadEntries();

    addBtn.addEventListener('click', () => openForm());
    cancelFormBtn.addEventListener('click', closeForm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const title = document.getElementById('book-title').value.trim();
      if (!title) {
        alert('请填写书名。');
        return;
      }

      const editId = form.dataset.editId;
      const original = entries.find((item) => item.id === editId);
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
