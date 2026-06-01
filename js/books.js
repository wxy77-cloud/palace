/**
 * 纸间行旅 - 书籍模块专用脚本
 * 木质书架 + 书脊展示 + 点击展开详情
 */

(function() {
  'use strict';

  // 生成唯一ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // 获取存储键名
  function getStorageKey() {
    return 'palace_books_entries';
  }

  // 格式化日期
  function formatDate(dateStr) {
    if (!dateStr) return '未记录';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 渲染星级
  function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating ? '★' : '☆';
    }
    return stars;
  }

  // HTML转义
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 加载条目
  function loadEntries() {
    try {
      const key = getStorageKey();
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('加载数据失败:', e);
      return [];
    }
  }

  // 保存条目
  function saveEntries(entries) {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.error('保存数据失败:', e);
    }
  }

  // 计算书脊宽度（根据书名长度）
  function calculateSpineWidth(title) {
    const len = title.length;
    if (len <= 3) return 32;
    if (len <= 5) return 36;
    if (len <= 8) return 42;
    if (len <= 12) return 48;
    return 54;
  }

  // 获取书脊颜色（根据书名哈希分配）
  function getSpineColor(title) {
    const colors = ['cream', 'pink', 'sage', 'sky', 'milktea', 'lavender', 'butter'];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // 渲染书架
  function renderEntries() {
    const container = document.getElementById('entries-container');
    const entries = loadEntries();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="bookshelf-empty">
          <div class="bookshelf-empty__icon">📚</div>
          <p class="bookshelf-empty__text">书架空空如也，快添加第一本书吧</p>
        </div>
      `;
      return;
    }

    // 按时间倒序
    const sortedEntries = [...entries].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // 每层书架最多放的书数量
    const booksPerRow = 8;
    // 计算需要的层数
    const rowCount = Math.ceil(sortedEntries.length / booksPerRow);

    let html = '<div class="bookshelf-container"><div class="bookshelf">';

    // 生成书架行
    for (let row = 0; row < rowCount; row++) {
      const rowBooks = sortedEntries.slice(row * booksPerRow, (row + 1) * booksPerRow);

      html += '<div class="bookshelf-row">';

      rowBooks.forEach(entry => {
        const spineWidth = calculateSpineWidth(entry.title);
        const spineColor = getSpineColor(entry.title);

        html += `
          <div class="book-spine book-spine--${spineColor}"
               style="width: ${spineWidth}px; height: ${140 + Math.random() * 20}px;"
               data-id="${escapeHtml(entry.id)}"
               title="${escapeHtml(entry.title)}">
            <span class="book-spine__title">${escapeHtml(entry.title)}</span>
          </div>
        `;
      });

      html += '</div>';
    }

    html += '</div></div>';

    // 添加模态框
    html += `
      <div class="book-modal" id="book-modal">
        <div class="book-modal__content">
          <button class="book-modal__close" id="modal-close">×</button>
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
              <button class="book-modal__edit" id="modal-edit-btn">编辑</button>
              <button class="book-modal__save" id="modal-save-btn" style="display:none">保存</button>
              <button class="book-modal__cancel" id="modal-cancel-btn" style="display:none">取消</button>
              <button class="book-modal__delete" id="modal-delete-btn">删除</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // 绑定事件
    bindEvents(sortedEntries);
  }

  // 绑定事件
  function bindEvents(entries) {
    // 书脊点击事件
    document.querySelectorAll('.book-spine').forEach(spine => {
      spine.addEventListener('click', () => {
        const id = spine.dataset.id;
        const entry = entries.find(e => e.id === id);
        if (entry) {
          openModal(entry);
        }
      });
    });

    // 模态框关闭按钮
    document.getElementById('modal-close').addEventListener('click', closeModal);

    // 点击模态框背景关闭
    document.getElementById('book-modal').addEventListener('click', (e) => {
      if (e.target.id === 'book-modal') {
        closeModal();
      }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });

    // 编辑按钮
    document.getElementById('modal-edit-btn').addEventListener('click', () => {
      startEditing();
    });

    // 取消编辑
    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
      cancelEditing();
    });

    // 保存编辑
    document.getElementById('modal-save-btn').addEventListener('click', () => {
      saveEditing();
    });

    // 删除按钮
    document.getElementById('modal-delete-btn').addEventListener('click', () => {
      if (confirm('确定要删除这本书吗？')) {
        deleteCurrentEntry();
      }
    });
  }

  let currentEntryId = null;

  // 打开模态框
  function openModal(entry) {
    currentEntryId = entry.id;

    document.getElementById('modal-title').textContent = entry.title;
    document.getElementById('modal-author').textContent = entry.author || '未知作者';
    document.getElementById('modal-rating').textContent = renderStars(entry.rating || 0);
    document.getElementById('modal-date').textContent = entry.readDate || '未记录';
    document.getElementById('modal-review').textContent = entry.review;
    document.getElementById('modal-textarea').value = entry.review;
    document.getElementById('modal-edit-count').textContent = `编辑 ${entry.editCount || 0} 次`;

    document.getElementById('book-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // 关闭模态框
  function closeModal() {
    document.getElementById('book-modal').classList.remove('active');
    document.getElementById('book-modal').classList.remove('editing');
    document.body.style.overflow = '';

    // 重置编辑状态
    cancelEditing();
    currentEntryId = null;
  }

  // 开始编辑
  function startEditing() {
    document.getElementById('book-modal').classList.add('editing');
    document.getElementById('modal-edit-btn').style.display = 'none';
    document.getElementById('modal-save-btn').style.display = 'inline-block';
    document.getElementById('modal-cancel-btn').style.display = 'inline-block';
    document.getElementById('modal-textarea').focus();
  }

  // 取消编辑
  function cancelEditing() {
    document.getElementById('book-modal').classList.remove('editing');
    document.getElementById('modal-edit-btn').style.display = 'inline-block';
    document.getElementById('modal-save-btn').style.display = 'none';
    document.getElementById('modal-cancel-btn').style.display = 'none';

    // 恢复原内容
    const entries = loadEntries();
    const entry = entries.find(e => e.id === currentEntryId);
    if (entry) {
      document.getElementById('modal-review').textContent = entry.review;
      document.getElementById('modal-textarea').value = entry.review;
    }
  }

  // 保存编辑
  function saveEditing() {
    const newContent = document.getElementById('modal-textarea').value.trim();
    if (!newContent) {
      alert('书评不能为空');
      return;
    }

    const entries = loadEntries();
    const index = entries.findIndex(e => e.id === currentEntryId);
    if (index === -1) return;

    entries[index].review = newContent;
    entries[index].editCount = (entries[index].editCount || 0) + 1;
    entries[index].updatedAt = new Date().toISOString();

    saveEntries(entries);

    document.getElementById('modal-review').textContent = newContent;
    document.getElementById('modal-edit-count').textContent = `编辑 ${entries[index].editCount} 次`;

    closeModal();
  }

  // 删除当前条目
  function deleteCurrentEntry() {
    const entries = loadEntries();
    const index = entries.findIndex(e => e.id === currentEntryId);
    if (index === -1) return;

    entries.splice(index, 1);
    saveEntries(entries);
    closeModal();
    renderEntries();
  }

  // 初始化星级评分
  function initStarRating() {
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('book-rating');

    stars.forEach(star => {
      star.addEventListener('click', () => {
        const value = parseInt(star.dataset.value);
        ratingInput.value = value;
        updateStars(value);
      });

      star.addEventListener('mouseenter', () => {
        const value = parseInt(star.dataset.value);
        highlightStars(value);
      });
    });

    document.getElementById('star-rating').addEventListener('mouseleave', () => {
      const currentRating = parseInt(ratingInput.value);
      updateStars(currentRating);
    });
  }

  function highlightStars(count) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
      if (index < count) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  function updateStars(count) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
      if (index < count) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  // 初始化页面
  function init() {
    const addBtn = document.getElementById('add-btn');
    const inputForm = document.getElementById('input-form');
    const cancelFormBtn = document.getElementById('cancel-form');

    // 初始化星级评分
    initStarRating();

    // 添加按钮
    addBtn.addEventListener('click', () => {
      inputForm.classList.add('active');
      addBtn.style.display = 'none';
      document.getElementById('book-title').focus();
    });

    // 取消按钮
    cancelFormBtn.addEventListener('click', () => {
      inputForm.classList.remove('active');
      addBtn.style.display = 'inline-flex';
      inputForm.reset();
      document.getElementById('book-rating').value = 0;
      updateStars(0);
    });

    // 提交表单
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('book-title').value.trim();
      const author = document.getElementById('book-author').value.trim();
      const rating = parseInt(document.getElementById('book-rating').value) || 0;
      const readDate = document.getElementById('book-date').value;
      const review = document.getElementById('book-review').value.trim();

      if (!title || !review) {
        alert('请填写书名和书评');
        return;
      }

      const entries = loadEntries();
      const now = new Date();

      entries.push({
        id: generateId(),
        title: title,
        author: author,
        rating: rating,
        readDate: formatDate(readDate),
        review: review,
        createdAt: now.toISOString(),
        updatedAt: null,
        editCount: 0
      });

      saveEntries(entries);

      inputForm.reset();
      document.getElementById('book-rating').value = 0;
      updateStars(0);
      inputForm.classList.remove('active');
      addBtn.style.display = 'inline-flex';

      renderEntries();
    });

    // 初始渲染
    renderEntries();
  }

  // DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
