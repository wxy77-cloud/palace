(function () {
  'use strict';

  const page = 'books';
  let currentEntryId = null;
  let currentEntries = [];

  function formatDate(dateStr) {
    if (!dateStr) return '未记录';
    const date = new Date(dateStr);
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
    let stars = '';
    for (let i = 1; i <= 5; i += 1) {
      stars += i <= rating ? '★' : '☆';
    }
    return stars;
  }

  function calculateSpineWidth(title) {
    const len = title.length;
    if (len <= 3) return 32;
    if (len <= 5) return 36;
    if (len <= 8) return 42;
    if (len <= 12) return 48;
    return 54;
  }

  function getSpineColor(title) {
    const colors = ['cream', 'pink', 'sage', 'sky', 'milktea', 'lavender', 'butter'];
    let hash = 0;
    for (let i = 0; i < title.length; i += 1) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  async function renderEntries() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      currentEntries = await window.PalaceDB.listEntries(page);
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

    const booksPerRow = 8;
    const rowCount = Math.ceil(currentEntries.length / booksPerRow);
    let html = '<div class="bookshelf-container"><div class="bookshelf">';

    for (let row = 0; row < rowCount; row += 1) {
      const rowBooks = currentEntries.slice(row * booksPerRow, (row + 1) * booksPerRow);
      html += '<div class="bookshelf-row">';

      rowBooks.forEach((entry, index) => {
        const spineWidth = calculateSpineWidth(entry.title);
        const spineColor = getSpineColor(entry.title);
        const height = 140 + ((row * booksPerRow + index) % 5) * 4;

        html += `
          <div class="book-spine book-spine--${spineColor}"
               style="width: ${spineWidth}px; height: ${height}px;"
               data-id="${escapeHtml(entry.id)}"
               title="${escapeHtml(entry.title)}">
            <span class="book-spine__title">${escapeHtml(entry.title)}</span>
          </div>
        `;
      });

      html += '</div>';
    }

    html += '</div></div>';
    html += `
      <div class="book-modal" id="book-modal">
        <div class="book-modal__content">
          <button class="book-modal__close" id="modal-close" type="button">×</button>
          <h2 class="book-modal__title" id="modal-title"></h2>
          <p class="book-modal__author" id="modal-author"></p>
          <div class="book-modal__meta">
            <span class="book-modal__rating" id="modal-rating"></span>
            <span class="book-modal__date" id="modal-date"></span>
          </div>
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

  function openModal(entry) {
    currentEntryId = entry.id;
    document.getElementById('modal-title').textContent = entry.title;
    document.getElementById('modal-author').textContent = entry.author || '未知作者';
    document.getElementById('modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('modal-date').textContent = entry.readDate || '未记录';
    document.getElementById('modal-review').textContent = entry.review || '';
    document.getElementById('modal-textarea').value = entry.review || '';
    document.getElementById('modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;
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
    if (entry) document.getElementById('modal-textarea').value = entry.review || '';
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
      await window.PalaceDB.updateEntry(entry.id, { ...entry, review, content: review });
      closeModal();
      await renderEntries();
    } catch (error) {
      alert(error.message || '保存失败。');
    }
  }

  async function deleteCurrentEntry() {
    if (!currentEntryId || !confirm('确定要删除这本书吗？')) return;
    try {
      await window.PalaceDB.deleteEntry(currentEntryId);
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
      star.addEventListener('click', () => {
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
      const rating = parseInt(document.getElementById('book-rating').value, 10) || 0;
      const readDate = document.getElementById('book-date').value;
      const review = document.getElementById('book-review').value.trim();

      if (!title || !review) {
        alert('请填写书名和书评。');
        return;
      }

      const submitBtn = inputForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;

      try {
        const now = new Date();
        await window.PalaceDB.createEntry(page, {
          title,
          author,
          rating,
          readDate: formatDate(readDate),
          review,
          content: review,
          createdAt: now.toISOString(),
          updatedAt: null,
          editCount: 0
        });

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
