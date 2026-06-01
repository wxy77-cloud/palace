(function () {
  'use strict';

  const page = window.PalaceDB.getPageName();

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showError(message) {
    const container = document.getElementById('entries-container');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__text">${escapeHtml(message)}</p>
      </div>
    `;
  }

  async function loadEntries() {
    return window.PalaceDB.listEntries(page);
  }

  async function renderEntries() {
    const container = document.getElementById('entries-container');
    if (!container) return;

    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!user) return;

    let entries = [];
    try {
      entries = await loadEntries();
    } catch (error) {
      showError(error.message || '加载失败，请稍后重试。');
      return;
    }

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">✦</div>
          <p class="empty-state__text">暂无记录，点击上方按钮添加第一笔珍藏。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = entries.map((entry) => `
      <article class="entry-card" data-id="${escapeHtml(entry.id)}">
        <div class="entry-card__header">
          <h3 class="entry-card__title">${escapeHtml(entry.title)}</h3>
          <span class="entry-card__meta">${escapeHtml(entry.date || formatDateTime(new Date(entry.createdAt)))}</span>
        </div>
        <div class="entry-card__content">${escapeHtml(entry.content)}</div>
        <textarea class="edit-textarea">${escapeHtml(entry.content)}</textarea>
        <div class="entry-card__footer">
          <span class="entry-card__edit-count">编辑 ${entry.editCount || 0} 次</span>
          <div class="entry-card__actions">
            <button class="edit-btn" type="button">编辑</button>
            <button class="save-btn" type="button" style="display:none">保存</button>
            <button class="cancel-btn" type="button" style="display:none">取消</button>
            <button class="delete-btn" type="button">删除</button>
          </div>
        </div>
      </article>
    `).join('');

    bindEntryEvents(entries);
  }

  function bindEntryEvents(entries) {
    document.querySelectorAll('.entry-card').forEach((card) => {
      const entryId = card.dataset.id;
      const editBtn = card.querySelector('.edit-btn');
      const saveBtn = card.querySelector('.save-btn');
      const cancelBtn = card.querySelector('.cancel-btn');
      const deleteBtn = card.querySelector('.delete-btn');
      const textarea = card.querySelector('.edit-textarea');
      const entry = entries.find((item) => item.id === entryId);

      editBtn.addEventListener('click', () => {
        card.classList.add('editing');
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        textarea.focus();
      });

      cancelBtn.addEventListener('click', () => {
        textarea.value = entry ? entry.content : '';
        card.classList.remove('editing');
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
      });

      saveBtn.addEventListener('click', async () => {
        const newContent = textarea.value.trim();
        if (!newContent || !entry) return;

        saveBtn.disabled = true;
        try {
          await window.PalaceDB.updateEntry(entryId, { ...entry, content: newContent });
          await renderEntries();
        } catch (error) {
          alert(error.message || '保存失败。');
        } finally {
          saveBtn.disabled = false;
        }
      });

      deleteBtn.addEventListener('click', async () => {
        if (!confirm('确定要删除这条记录吗？')) return;

        deleteBtn.disabled = true;
        try {
          await window.PalaceDB.deleteEntry(entryId);
          await renderEntries();
        } catch (error) {
          alert(error.message || '删除失败。');
        } finally {
          deleteBtn.disabled = false;
        }
      });
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const inputForm = document.getElementById('input-form');
    const cancelFormBtn = document.getElementById('cancel-form');

    addBtn.addEventListener('click', () => {
      inputForm.classList.add('active');
      addBtn.style.display = 'none';
      document.getElementById('entry-title').focus();
    });

    cancelFormBtn.addEventListener('click', () => {
      inputForm.classList.remove('active');
      addBtn.style.display = 'inline-flex';
      inputForm.reset();
    });

    inputForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const title = document.getElementById('entry-title').value.trim();
      const content = document.getElementById('entry-content').value.trim();

      if (!title || !content) return;

      const submitBtn = inputForm.querySelector('[type="submit"]');
      const now = new Date();

      submitBtn.disabled = true;
      try {
        await window.PalaceDB.createEntry(page, {
          title,
          content,
          date: formatDateTime(now),
          createdAt: now.toISOString(),
          updatedAt: null,
          editCount: 0
        });

        inputForm.reset();
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
