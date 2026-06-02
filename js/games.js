(function () {
  'use strict';

  const page = 'games';
  let entries = [];

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateStars(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  function normalizeTags(rawTags) {
    const tags = Array.isArray(rawTags) ? rawTags : [rawTags];
    return Array.from(new Set(tags
      .flatMap((tag) => String(tag || '').split(/[,，、\s]+/))
      .map((tag) => tag.trim())
      .filter(Boolean)));
  }

  function getSelectedTags() {
    const selected = Array.from(document.querySelectorAll('.game-tag-option.active'))
      .map((button) => button.dataset.tag);
    const custom = document.getElementById('game-custom-tags').value;
    return normalizeTags([...selected, custom]);
  }

  function setSelectedTags(tags) {
    const normalized = normalizeTags(tags || []);
    document.querySelectorAll('.game-tag-option').forEach((button) => {
      button.classList.toggle('active', normalized.includes(button.dataset.tag));
    });

    const presetTags = Array.from(document.querySelectorAll('.game-tag-option'))
      .map((button) => button.dataset.tag);
    const customTags = normalized.filter((tag) => !presetTags.includes(tag));
    document.getElementById('game-custom-tags').value = customTags.join('，');
  }

  function setRating(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    document.getElementById('game-rating').value = value;
    document.querySelectorAll('.game-star').forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    setRating(0);
    setSelectedTags([]);
  }

  function closeForm() {
    document.getElementById('input-form').classList.remove('active');
    document.getElementById('add-btn').style.display = 'inline-flex';
    resetForm();
  }

  function openForm(entry) {
    const form = document.getElementById('input-form');
    form.classList.add('active');
    document.getElementById('add-btn').style.display = 'none';

    if (entry) {
      form.dataset.editId = entry.id;
      document.getElementById('game-title').value = entry.gameTitle || entry.title || '';
      document.getElementById('game-platform').value = entry.platform || '';
      document.getElementById('game-status').value = entry.status || '想玩';
      document.getElementById('game-date').value = entry.playDate || '';
      document.getElementById('game-playtime').value = entry.playtime || '';
      document.getElementById('game-highlight').value = entry.highlight || '';
      document.getElementById('game-notes').value = entry.notes || entry.content || '';
      setRating(entry.rating || 0);
      setSelectedTags(entry.tags || []);
    } else {
      resetForm();
    }

    document.getElementById('game-title').focus();
  }

  async function renderEntries() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      container.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🎮</div>
          <p class="empty-state__text">暂无记录，点击上方按钮添加第一款游戏。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="game-list">
        ${entries.map((entry) => {
          const tags = normalizeTags(entry.tags || []);
          return `
            <article class="game-card" data-id="${escapeHtml(entry.id)}">
              <div class="game-card__screen">
                <span>${escapeHtml(entry.status || '未标记')}</span>
              </div>
              <div class="game-card__body">
                <div class="game-card__header">
                  <div>
                    <h2 class="game-card__title">${escapeHtml(entry.gameTitle || entry.title)}</h2>
                    <p class="game-card__platform">${escapeHtml(entry.platform || '平台未记录')}</p>
                  </div>
                  <span class="game-card__rating">${generateStars(entry.rating || 0)}</span>
                </div>
                <div class="game-card__meta">
                  <span>${escapeHtml(entry.playDate || '记录日期未填写')}</span>
                  ${entry.playtime ? `<span>${escapeHtml(entry.playtime)}</span>` : ''}
                </div>
                ${tags.length > 0 ? `<div class="game-card__tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                ${entry.highlight ? `<div class="game-card__block"><span>高光时刻</span><p>${escapeHtml(entry.highlight)}</p></div>` : ''}
                <div class="game-card__block">
                  <span>游玩笔记</span>
                  <p>${escapeHtml(entry.notes || entry.content || '暂无笔记')}</p>
                </div>
                <div class="game-card__footer">
                  <span class="game-card__edit-count">编辑 ${entry.editCount || 0} 次</span>
                  <div class="game-card__actions">
                    <button class="game-edit-btn" type="button">编辑</button>
                    <button class="game-delete-btn" type="button">删除</button>
                  </div>
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
    document.querySelectorAll('.game-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.game-edit-btn').addEventListener('click', () => openForm(entry));
      card.querySelector('.game-delete-btn').addEventListener('click', async () => {
        if (!entry || !confirm('确定要删除这条游戏记录吗？')) return;
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
    document.querySelectorAll('.game-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    document.querySelectorAll('.game-tag-option').forEach((button) => {
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
    cancelBtn.addEventListener('click', closeForm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const gameTitle = document.getElementById('game-title').value.trim();
      const platform = document.getElementById('game-platform').value.trim();
      const status = document.getElementById('game-status').value;
      const playDate = document.getElementById('game-date').value;
      const playtime = document.getElementById('game-playtime').value.trim();
      const rating = parseInt(document.getElementById('game-rating').value, 10) || 0;
      const tags = getSelectedTags();
      const highlight = document.getElementById('game-highlight').value.trim();
      const notes = document.getElementById('game-notes').value.trim();

      if (!gameTitle) {
        alert('请填写游戏名称。');
        return;
      }

      const editId = form.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const now = new Date();
      const contentParts = [highlight, notes].filter(Boolean);
      const payload = {
        ...(original || {}),
        gameTitle,
        title: gameTitle,
        platform,
        status,
        playDate,
        playtime,
        rating,
        tags,
        highlight,
        notes,
        content: contentParts.join('\n\n'),
        date: playDate || (original ? original.date : formatDate(now)),
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
        closeForm();
        await renderEntries();
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
