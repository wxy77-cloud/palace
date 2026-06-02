(function () {
  'use strict';

  const page = 'webnovels';
  let entries = [];

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(date) {
    if (!date) return '';
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

  function getSelectedTags() {
    const selected = Array.from(document.querySelectorAll('.webnovel-tag-option.active'))
      .map((button) => button.dataset.tag);
    const custom = document.getElementById('novel-custom-tags').value;
    return normalizeTags([...selected, custom]);
  }

  function setSelectedTags(tags) {
    const normalized = normalizeTags(tags || []);
    const presetTags = Array.from(document.querySelectorAll('.webnovel-tag-option'))
      .map((button) => button.dataset.tag);

    document.querySelectorAll('.webnovel-tag-option').forEach((button) => {
      button.classList.toggle('active', normalized.includes(button.dataset.tag));
    });

    document.getElementById('novel-custom-tags').value = normalized
      .filter((tag) => !presetTags.includes(tag))
      .join('，');
  }

  function setRating(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    document.getElementById('novel-rating').value = value;
    document.querySelectorAll('.webnovel-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    document.getElementById('novel-read-count').value = 1;
    setRating(0);
    setSelectedTags([]);
  }

  function closeForm(options) {
    const form = document.getElementById('input-form');
    const portal = document.getElementById('portal-shell');
    const shouldAnimate = options && options.animateReturn;

    if (shouldAnimate) {
      portal.classList.add('portal-saving');
      window.setTimeout(() => {
        form.classList.remove('active');
        portal.classList.remove('portal-open', 'portal-saving');
        resetForm();
      }, 620);
      return;
    }

    form.classList.remove('active');
    portal.classList.remove('portal-open', 'portal-saving');
    resetForm();
  }

  function openForm(entry) {
    const form = document.getElementById('input-form');
    const portal = document.getElementById('portal-shell');
    portal.classList.add('portal-open');
    form.classList.add('active');

    if (entry) {
      form.dataset.editId = entry.id;
      document.getElementById('novel-title').value = entry.bookTitle || entry.title || '';
      document.getElementById('novel-author').value = entry.author || '';
      document.getElementById('novel-platform').value = entry.platform || '';
      document.getElementById('novel-status').value = entry.status || '想读';
      document.getElementById('novel-first-met').value = entry.firstMet || '';
      document.getElementById('novel-progress').value = entry.progress || '';
      document.getElementById('novel-read-count').value = Number.isFinite(Number(entry.readCount)) ? Number(entry.readCount) : 1;
      document.getElementById('novel-favorite').checked = Boolean(entry.favorite);
      document.getElementById('novel-review').value = entry.review || entry.content || '';
      setRating(entry.rating || 0);
      setSelectedTags(entry.tags || []);
    } else {
      resetForm();
    }

    window.setTimeout(() => document.getElementById('novel-title').focus(), 260);
  }

  async function renderEntries() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      container.innerHTML = `<div class="empty-state webnovel-empty"><p class="empty-state__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state webnovel-empty">
          <div class="empty-state__icon">🌙</div>
          <p class="empty-state__text">暂无记录，点击右下角的光之门召唤第一页手稿。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="webnovel-list">
        ${entries.map((entry) => {
          const title = entry.bookTitle || entry.title || '未命名作品';
          const tags = normalizeTags(entry.tags || []);
          const status = entry.status || '未记录状态';
          const review = entry.review || entry.content || '暂无评价';
          const readCount = Number.isFinite(Number(entry.readCount)) ? Number(entry.readCount) : 0;
          return `
            <article class="webnovel-manuscript ${entry.favorite ? 'webnovel-manuscript--favorite' : ''}" data-id="${escapeHtml(entry.id)}">
              <div class="webnovel-manuscript__header">
                <div>
                  <h2 class="webnovel-manuscript__title">${escapeHtml(title)}</h2>
                  <p class="webnovel-manuscript__author">${escapeHtml(entry.author || '作者未记录')}${entry.platform ? ` · ${escapeHtml(entry.platform)}` : ''}</p>
                </div>
                <span class="webnovel-manuscript__rating">${renderStars(entry.rating || 0)}</span>
              </div>

              <div class="webnovel-manuscript__badges">
                <span class="webnovel-manuscript__badge">${escapeHtml(status)}</span>
                ${entry.favorite ? '<span class="webnovel-manuscript__badge webnovel-manuscript__badge--favorite">真爱</span>' : ''}
              </div>

              <div class="webnovel-manuscript__meta">
                ${entry.firstMet ? `<span>初遇 ${escapeHtml(entry.firstMet)}</span>` : '<span>初遇未记录</span>'}
                ${entry.progress ? `<span>进度 ${escapeHtml(entry.progress)}</span>` : '<span>进度未记录</span>'}
                <span>阅读 ${readCount} 次</span>
              </div>

              ${tags.length > 0 ? `<div class="webnovel-manuscript__tags">${tags.map((tag) => `<span class="webnovel-manuscript__tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
              <p class="webnovel-manuscript__review">${escapeHtml(review)}</p>

              <div class="webnovel-manuscript__footer">
                <span class="webnovel-manuscript__edit-count">编辑 ${entry.editCount || 0} 次</span>
                <div class="webnovel-manuscript__actions">
                  <button class="webnovel-edit-btn" type="button">编辑</button>
                  <button class="webnovel-delete-btn" type="button">删除</button>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    bindEntryEvents();
  }

  function bindEntryEvents() {
    document.querySelectorAll('.webnovel-manuscript').forEach((manuscript) => {
      const entry = entries.find((item) => item.id === manuscript.dataset.id);
      manuscript.querySelector('.webnovel-edit-btn').addEventListener('click', () => openForm(entry));
      manuscript.querySelector('.webnovel-delete-btn').addEventListener('click', async () => {
        if (!entry || !confirm('确定要删除这条网文记录吗？')) return;
        try {
          await window.PalaceDB.deleteEntry(entry.id);
          await renderEntries();
        } catch (error) {
          alert(error.message || '删除失败。');
        }
      });
    });
  }

  function initInteractions() {
    document.querySelectorAll('.webnovel-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    document.querySelectorAll('.webnovel-tag-option').forEach((button) => {
      button.addEventListener('click', () => button.classList.toggle('active'));
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const form = document.getElementById('input-form');
    const cancelBtn = document.getElementById('cancel-form');

    initInteractions();
    renderEntries();

    addBtn.addEventListener('click', () => openForm());
    cancelBtn.addEventListener('click', () => closeForm());

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const bookTitle = document.getElementById('novel-title').value.trim();
      const author = document.getElementById('novel-author').value.trim();
      const platform = document.getElementById('novel-platform').value.trim();
      const status = document.getElementById('novel-status').value;
      const firstMet = document.getElementById('novel-first-met').value;
      const progress = document.getElementById('novel-progress').value.trim();
      const rating = parseInt(document.getElementById('novel-rating').value, 10) || 0;
      const tags = getSelectedTags();
      const review = document.getElementById('novel-review').value.trim();
      const readCount = Math.max(0, parseInt(document.getElementById('novel-read-count').value, 10) || 0);
      const favorite = document.getElementById('novel-favorite').checked;

      if (!bookTitle) {
        alert('请填写书名。');
        return;
      }

      const editId = form.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const now = new Date();
      const payload = {
        ...(original || {}),
        bookTitle,
        title: bookTitle,
        author,
        platform,
        tags,
        status,
        firstMet,
        progress,
        rating,
        review,
        readCount,
        favorite,
        content: review,
        date: firstMet || (original ? original.date : formatDate(now)),
        createdAt: original ? original.createdAt : now.toISOString()
      };

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;

      try {
        if (editId) {
          await window.PalaceDB.updateEntry(editId, payload);
        } else {
          await window.PalaceDB.createEntry(page, { ...payload, editCount: 0 });
        }
        await renderEntries();
        closeForm({ animateReturn: true });
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
