(function () {
  'use strict';

  const page = 'books';
  let currentEntryId = null;
  let currentEntries = [];

  function formatDate(dateStr) {
    if (!dateStr) return '未记录';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
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

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  function calculateSpineWidth(title) {
    const len = String(title || '').length;
    if (len <= 3) return 38;
    if (len <= 5) return 44;
    if (len <= 8) return 50;
    if (len <= 12) return 58;
    return 64;
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
    
    let availableColors = colorsByRating[rating] || colorsByRating[3];
    if (typeColorMap[bookType]) {
      availableColors = typeColorMap[bookType];
    }
    
    const title = entry.title || '';
    let hash = 0;
    title.split('').forEach((char) => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    return availableColors[Math.abs(hash) % availableColors.length];
  }

  function getBookLean(index) {
    const leans = [-2.2, 0.9, -0.7, 1.6, -1.2, 0.4, 2.1, -0.4, 1.3];
    return leans[index % leans.length];
  }

  function getBookHeight(row, index) {
    return 152 + ((row * 9 + index) % 7) * 7;
  }

  function getDisplayTitle(entry) {
    return entry.title || entry.bookTitle || '未命名书籍';
  }

  function renderShelfDecor(rowBooks, row) {
    const decorTypes = ['candle', 'crystal', 'owl', 'vase', 'stack'];
    
    if (rowBooks.length < 6) {
      const firstDecor = decorTypes[row % decorTypes.length];
      const secondDecor = decorTypes[(row + 2) % decorTypes.length];
      
      let html = '';
      if (firstDecor === 'owl') {
        html += `
          <div class="shelf-object shelf-object--owl" aria-hidden="true">
            <span class="owl-eye"></span>
            <span class="owl-eye"></span>
          </div>
        `;
      } else {
        html += `<div class="shelf-object shelf-object--${firstDecor}" aria-hidden="true"></div>`;
      }
      
      if (secondDecor !== firstDecor && rowBooks.length < 5) {
        if (secondDecor === 'owl') {
          html += `
            <div class="shelf-object shelf-object--owl" aria-hidden="true">
              <span class="owl-eye"></span>
              <span class="owl-eye"></span>
            </div>
          `;
        } else {
          html += `<div class="shelf-object shelf-object--${secondDecor}" aria-hidden="true"></div>`;
        }
      }
      
      return html;
    }
    
    if (rowBooks.length < 8) {
      const decor = decorTypes[(row + 1) % decorTypes.length];
      if (decor === 'owl') {
        return `
          <div class="shelf-object shelf-object--owl" aria-hidden="true">
            <span class="owl-eye"></span>
            <span class="owl-eye"></span>
          </div>
        `;
      }
      return `<div class="shelf-object shelf-object--${decor}" aria-hidden="true"></div>`;
    }
    
    if (row % 3 === 0) {
      return '<div class="shelf-object shelf-object--bookend" aria-hidden="true"></div>';
    }
    
    if (row % 4 === 1) {
      return '<div class="shelf-object shelf-object--candle" aria-hidden="true"></div>';
    }
    
    return '';
  }

  async function renderEntries() {
    const container = document.getElementById('entries-container');
    if (!container) return;

    try {
      const key = `palace_${page}_entries`;
      const data = localStorage.getItem(key);
      currentEntries = data ? JSON.parse(data) : [];
    } catch (error) {
      container.innerHTML = `<div class="bookshelf-empty"><p>${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    if (currentEntries.length === 0) {
      container.innerHTML = `
        <div class="bookshelf-empty">
          <div class="bookshelf-empty__icon">📚</div>
          <p class="bookshelf-empty__text">书架暂时空着，添加第一本书吧。</p>
        </div>
      `;
      return;
    }

    const booksPerRow = 9;
    const rowCount = Math.ceil(currentEntries.length / booksPerRow);
    let html = `
      <div class="library-cabinet" aria-label="读过的书架">
        <div class="library-cabinet__crown">纸间藏书阁</div>
        <div class="bookshelf">
    `;

    for (let row = 0; row < rowCount; row += 1) {
      const rowBooks = currentEntries.slice(row * booksPerRow, (row + 1) * booksPerRow);
      html += '<div class="bookshelf-row">';
      html += '<div class="shelf-bookend shelf-bookend--left" aria-hidden="true"></div>';

      rowBooks.forEach((entry, index) => {
        const title = getDisplayTitle(entry);
        const spineWidth = calculateSpineWidth(title);
        const spineColor = getSpineColor(entry);
        const height = getBookHeight(row, index);
        const lean = getBookLean(row * booksPerRow + index);

        html += `
          <button class="book-spine book-spine--${spineColor}"
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
    html += `
      <div class="book-modal" id="book-modal">
        <div class="book-modal__content">
          <button class="book-modal__close" id="modal-close" type="button">×</button>
          <div class="book-modal__spread">
            <section class="book-modal__page book-modal__page--left">
              <span class="book-modal__label">藏书票</span>
              <h2 class="book-modal__title" id="modal-title"></h2>
              <p class="book-modal__author" id="modal-author"></p>
              <span class="book-modal__type" id="modal-type"></span>
              <div class="book-modal__meta">
                <span class="book-modal__rating" id="modal-rating"></span>
                <span class="book-modal__date" id="modal-date"></span>
              </div>
            </section>
            <section class="book-modal__page book-modal__page--right">
              <span class="book-modal__label">读书笔记</span>
              <div class="book-modal__review" id="modal-review"></div>
              <textarea class="edit-textarea" id="modal-textarea"></textarea>
              <div class="book-modal__footer">
                <span class="book-modal__edit-count" id="modal-edit-count"></span>
                <div class="book-modal__actions">
                  <button class="book-modal__edit" id="modal-edit-btn" type="button">编辑</button>
                  <button class="book-modal__save" id="modal-save-btn" type="button" style="display:none">保存</button>
                  <button class="book-modal__cancel" id="modal-cancel-btn" type="button" style="display:none">取消</button>
                  <button class="book-modal__delete" id="modal-delete-btn" type="button">删除</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    document.querySelectorAll('.book-spine').forEach((spine) => {
      spine.addEventListener('click', () => {
        const entry = currentEntries.find((item) => item.id === spine.dataset.id);
        if (entry) openModal(entry);
      });
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('book-modal').addEventListener('click', (event) => {
      if (event.target.id === 'book-modal') closeModal();
    });
    document.getElementById('modal-edit-btn').addEventListener('click', startEditing);
    document.getElementById('modal-cancel-btn').addEventListener('click', cancelEditing);
    document.getElementById('modal-save-btn').addEventListener('click', saveEditing);
    document.getElementById('modal-delete-btn').addEventListener('click', deleteCurrentEntry);
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

  function openModal(entry) {
    currentEntryId = entry.id;
    document.getElementById('modal-title').textContent = getDisplayTitle(entry);
    document.getElementById('modal-author').textContent = entry.author || '未知作者';
    document.getElementById('modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('modal-date').textContent = entry.readDate || '未记录日期';
    document.getElementById('modal-review').textContent = entry.review || entry.content || '暂无书评';
    document.getElementById('modal-textarea').value = entry.review || entry.content || '';
    document.getElementById('modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
    
    const typeSpan = document.getElementById('modal-type');
    if (typeSpan) {
      const typeName = getTypeName(entry.type);
      typeSpan.textContent = typeName ? `【${typeName}】` : '';
      typeSpan.style.display = typeName ? 'inline' : 'none';
    }
    
    document.getElementById('book-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('book-modal');
    modal.classList.remove('active', 'editing');
    document.body.style.overflow = '';
    currentEntryId = null;
  }

  function startEditing() {
    document.getElementById('book-modal').classList.add('editing');
    document.getElementById('modal-edit-btn').style.display = 'none';
    document.getElementById('modal-save-btn').style.display = 'inline-block';
    document.getElementById('modal-cancel-btn').style.display = 'inline-block';
    document.getElementById('modal-textarea').focus();
  }

  function cancelEditing() {
    const entry = currentEntries.find((item) => item.id === currentEntryId);
    if (entry) document.getElementById('modal-textarea').value = entry.review || entry.content || '';
    document.getElementById('book-modal').classList.remove('editing');
    document.getElementById('modal-edit-btn').style.display = 'inline-block';
    document.getElementById('modal-save-btn').style.display = 'none';
    document.getElementById('modal-cancel-btn').style.display = 'none';
  }

  async function saveEditing() {
    const entry = currentEntries.find((item) => item.id === currentEntryId);
    const review = document.getElementById('modal-textarea').value.trim();
    if (!entry || !review) return;

    try {
      const key = `palace_${page}_entries`;
      entry.review = review;
      entry.content = review;
      entry.updatedAt = new Date().toISOString();
      entry.editCount = (entry.editCount || 0) + 1;
      localStorage.setItem(key, JSON.stringify(currentEntries));
      closeModal();
      await renderEntries();
    } catch (error) {
      alert(error.message || '保存失败。');
    }
  }

  async function deleteCurrentEntry() {
    if (!currentEntryId || !confirm('确定要删除这本书吗？')) return;
    try {
      const key = `palace_${page}_entries`;
      const index = currentEntries.findIndex((item) => item.id === currentEntryId);
      if (index !== -1) {
        currentEntries.splice(index, 1);
        localStorage.setItem(key, JSON.stringify(currentEntries));
      }
      closeModal();
      await renderEntries();
    } catch (error) {
      alert(error.message || '删除失败。');
    }
  }

  function initStarRating() {
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('book-rating');

    function updateStars(count) {
      stars.forEach((star, index) => {
        star.classList.toggle('active', index < count);
      });
    }

    stars.forEach((star) => {
      star.addEventListener('click', (e) => {
        e.preventDefault();
        const value = parseInt(star.dataset.value, 10);
        ratingInput.value = value;
        updateStars(value);
      });
    });

    return updateStars;
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const inputForm = document.getElementById('input-form');
    const cancelFormBtn = document.getElementById('cancel-form');
    const updateStars = initStarRating();

    addBtn.addEventListener('click', () => {
      inputForm.classList.add('active');
      addBtn.style.display = 'none';
      document.getElementById('book-title').focus();
    });

    cancelFormBtn.addEventListener('click', () => {
      inputForm.classList.remove('active');
      addBtn.style.display = 'inline-flex';
      inputForm.reset();
      document.getElementById('book-rating').value = 0;
      updateStars(0);
    });

    inputForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const title = document.getElementById('book-title').value.trim();
      const author = document.getElementById('book-author').value.trim();
      const bookType = document.getElementById('book-type').value;
      const rating = parseInt(document.getElementById('book-rating').value, 10) || 0;
      const readDate = document.getElementById('book-date').value;
      const review = document.getElementById('book-review').value.trim();

      if (!title) {
        alert('请填写书名。');
        return;
      }

      const submitBtn = inputForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;

      try {
        const key = `palace_${page}_entries`;
        const now = new Date();
        const newEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          title,
          author,
          type: bookType,
          rating,
          readDate: formatDate(readDate),
          review,
          content: review,
          createdAt: now.toISOString(),
          updatedAt: null,
          editCount: 0
        };
        
        currentEntries.push(newEntry);
        localStorage.setItem(key, JSON.stringify(currentEntries));

        inputForm.reset();
        document.getElementById('book-rating').value = 0;
        updateStars(0);
        inputForm.classList.remove('active');
        addBtn.style.display = 'inline-flex';
        await renderEntries();
      } catch (error) {
        alert(error.message || '保存失败。');
      } finally {
        submitBtn.disabled = false;
      }
    });

    renderEntries();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();