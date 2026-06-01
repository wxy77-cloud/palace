/**
 * 心灵宫殿 - 通用页面功能
 * 处理输入、提交、编辑、删除功能
 */

(function() {
  'use strict';

  // 生成唯一ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // 获取当前页面的存储键名
  function getStorageKey() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '');
    return `palace_${page}_entries`;
  }

  // 格式化日期时间
  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // 从 localStorage 加载条目
  function loadEntries() {
    try {
      const key = getStorageKey();
      const data = localStorage.getItem(key);
      console.log('[调试] 存储键:', key);
      console.log('[调试] localStorage 原始数据:', data);
      const entries = data ? JSON.parse(data) : [];
      console.log('[调试] 解析后的条目数:', entries.length);
      return entries;
    } catch (e) {
      console.error('[调试] 加载数据失败:', e);
      return [];
    }
  }

  // 保存条目到 localStorage
  function saveEntries(entries) {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.error('保存数据失败:', e);
    }
  }

  // HTML 转义
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 渲染所有条目
  function renderEntries() {
    const container = document.getElementById('entries-container');
    console.log('[调试] renderEntries 被调用');
    console.log('[调试] container 元素:', container);

    if (!container) {
      console.error('[调试] 找不到 entries-container 元素');
      return;
    }

    const entries = loadEntries();
    console.log('[调试] 待渲染条目数:', entries.length);

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📖</div>
          <p class="empty-state__text">暂无记录，点击上方按钮添加第一笔珍藏</p>
        </div>
      `;
      return;
    }

    // 按时间倒序排列（最新的在前），使用 createdAt 进行比较
    const sortedEntries = [...entries].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    container.innerHTML = sortedEntries.map(entry => `
      <article class="entry-card" data-id="${escapeHtml(entry.id)}">
        <div class="entry-card__header">
          <h3 class="entry-card__title">${escapeHtml(entry.title)}</h3>
          <span class="entry-card__meta">${escapeHtml(entry.date)}</span>
        </div>
        <div class="entry-card__content">${escapeHtml(entry.content)}</div>
        <textarea class="edit-textarea">${escapeHtml(entry.content)}</textarea>
        <div class="entry-card__footer">
          <span class="entry-card__edit-count">编辑 ${entry.editCount || 0} 次</span>
          <div class="entry-card__actions">
            <button class="edit-btn">编辑</button>
            <button class="save-btn" style="display:none">保存</button>
            <button class="cancel-btn" style="display:none">取消</button>
            <button class="delete-btn">删除</button>
          </div>
        </div>
      </article>
    `).join('');

    // 绑定事件
    bindEntryEvents();
  }

  // 根据ID找到条目在数组中的索引
  function findEntryIndex(entries, id) {
    return entries.findIndex(entry => entry.id === id);
  }

  // 绑定条目事件
  function bindEntryEvents() {
    document.querySelectorAll('.entry-card').forEach(card => {
      const entryId = card.dataset.id;
      const editBtn = card.querySelector('.edit-btn');
      const saveBtn = card.querySelector('.save-btn');
      const cancelBtn = card.querySelector('.cancel-btn');
      const deleteBtn = card.querySelector('.delete-btn');
      const textarea = card.querySelector('.edit-textarea');
      const contentDiv = card.querySelector('.entry-card__content');
      const editCountSpan = card.querySelector('.entry-card__edit-count');

      editBtn.addEventListener('click', () => {
        card.classList.add('editing');
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        textarea.focus();
      });

      cancelBtn.addEventListener('click', () => {
        card.classList.remove('editing');
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        // 恢复原内容
        const entries = loadEntries();
        const index = findEntryIndex(entries, entryId);
        if (index !== -1) {
          textarea.value = entries[index].content;
        }
      });

      saveBtn.addEventListener('click', () => {
        const newContent = textarea.value.trim();
        if (!newContent) return;

        const entries = loadEntries();
        const index = findEntryIndex(entries, entryId);
        if (index === -1) return;

        entries[index].content = newContent;
        entries[index].editCount = (entries[index].editCount || 0) + 1;
        entries[index].updatedAt = new Date().toISOString();

        saveEntries(entries);

        // 更新UI
        contentDiv.textContent = newContent;
        editCountSpan.textContent = `编辑 ${entries[index].editCount} 次`;

        card.classList.remove('editing');
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
      });

      deleteBtn.addEventListener('click', () => {
        if (!confirm('确定要删除这条记录吗？')) return;

        const entries = loadEntries();
        const index = findEntryIndex(entries, entryId);
        if (index === -1) return;

        entries.splice(index, 1);
        saveEntries(entries);
        renderEntries();
      });
    });
  }

  // 初始化页面
  function init() {
    const addBtn = document.getElementById('add-btn');
    const inputForm = document.getElementById('input-form');
    const cancelFormBtn = document.getElementById('cancel-form');

    console.log('[调试] init 被调用');
    console.log('[调试] addBtn:', addBtn);
    console.log('[调试] inputForm:', inputForm);
    console.log('[调试] cancelFormBtn:', cancelFormBtn);

    // 点击添加按钮
    addBtn.addEventListener('click', () => {
      inputForm.classList.add('active');
      addBtn.style.display = 'none';
      document.getElementById('entry-title').focus();
    });

    // 点击取消
    cancelFormBtn.addEventListener('click', () => {
      inputForm.classList.remove('active');
      addBtn.style.display = 'inline-flex';
      inputForm.reset();
    });

    // 提交表单
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('entry-title').value.trim();
      const content = document.getElementById('entry-content').value.trim();

      console.log('[调试] 表单提交 - title:', title, 'content:', content);

      if (!title || !content) {
        console.log('[调试] 标题或内容为空，取消提交');
        return;
      }

      const entries = loadEntries();
      console.log('[调试] 提交前条目数:', entries.length);

      const now = new Date();

      const newEntry = {
        id: generateId(),
        title: title,
        content: content,
        date: formatDateTime(now),
        createdAt: now.toISOString(),
        updatedAt: null,
        editCount: 0
      };

      console.log('[调试] 新条目:', newEntry);

      entries.push(newEntry);
      saveEntries(entries);
      console.log('[调试] 保存后条目数:', entries.length);

      // 重置表单
      inputForm.reset();
      inputForm.classList.remove('active');
      addBtn.style.display = 'inline-flex';

      // 重新渲染
      renderEntries();
    });

    // 初始渲染
    renderEntries();
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
