(function () {
  'use strict';

  const page = 'movies';
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
    const selected = Array.from(document.querySelectorAll('.movie-tag-option.active'))
      .map((button) => button.dataset.tag);
    const custom = document.getElementById('movie-custom-tags').value;
    return normalizeTags([...selected, custom]);
  }

  function setSelectedTags(tags) {
    const normalized = normalizeTags(tags || []);
    document.querySelectorAll('.movie-tag-option').forEach((button) => {
      button.classList.toggle('active', normalized.includes(button.dataset.tag));
    });

    const presetTags = Array.from(document.querySelectorAll('.movie-tag-option'))
      .map((button) => button.dataset.tag);
    const customTags = normalized.filter((tag) => !presetTags.includes(tag));
    document.getElementById('movie-custom-tags').value = customTags.join('，');
  }

  function setRating(rating) {
    const value = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    document.getElementById('movie-rating').value = value;
    document.querySelectorAll('.movie-star').forEach((star, index) => {
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
      document.getElementById('movie-title').value = entry.movieTitle || entry.title || '';
      document.getElementById('movie-crew').value = entry.crew || '';
      document.getElementById('movie-date').value = entry.watchDate || '';
      document.getElementById('movie-review').value = entry.review || entry.content || '';
      document.getElementById('movie-companion').value = entry.companion || '';
      setRating(entry.rating || 0);
      setSelectedTags(entry.tags || []);
    } else {
      resetForm();
    }

    document.getElementById('movie-title').focus();
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
          <div class="empty-state__icon">🎞</div>
          <p class="empty-state__text">暂无记录，点击上方按钮添加第一部电影珍藏。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="movie-list">
        ${entries.map((entry) => {
          const tags = normalizeTags(entry.tags || []);
          return `
            <article class="movie-card" data-id="${escapeHtml(entry.id)}">
              <div class="movie-card__reel" aria-hidden="true"></div>
              <div class="movie-card__body">
                <div class="movie-card__header">
                  <div>
                    <h2 class="movie-card__title">${escapeHtml(entry.movieTitle || entry.title)}</h2>
                    <p class="movie-card__crew">${escapeHtml(entry.crew || '导演 / 主演未记录')}</p>
                  </div>
                  <span class="movie-card__rating">${generateStars(entry.rating || 0)}</span>
                </div>
                <div class="movie-card__meta">
                  <span>${escapeHtml(entry.watchDate || '观影日期未记录')}</span>
                  ${entry.companion ? `<span>与 ${escapeHtml(entry.companion)}</span>` : ''}
                </div>
                ${tags.length > 0 ? `<div class="movie-card__tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                <p class="movie-card__review">${escapeHtml(entry.review || entry.content || '暂无短评')}</p>
                <div class="movie-card__footer">
                  <span class="movie-card__edit-count">编辑 ${entry.editCount || 0} 次</span>
                  <div class="movie-card__actions">
                    <button class="movie-edit-btn" type="button">编辑</button>
                    <button class="movie-delete-btn" type="button">删除</button>
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
    document.querySelectorAll('.movie-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.movie-edit-btn').addEventListener('click', () => openForm(entry));
      card.querySelector('.movie-delete-btn').addEventListener('click', async () => {
        if (!entry || !confirm('确定要删除这条电影手记吗？')) return;
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
    document.querySelectorAll('.movie-star').forEach((star) => {
      star.addEventListener('click', () => setRating(star.dataset.value));
    });

    document.querySelectorAll('.movie-tag-option').forEach((button) => {
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

      const movieTitle = document.getElementById('movie-title').value.trim();
      const crew = document.getElementById('movie-crew').value.trim();
      const watchDate = document.getElementById('movie-date').value;
      const rating = parseInt(document.getElementById('movie-rating').value, 10) || 0;
      const tags = getSelectedTags();
      const review = document.getElementById('movie-review').value.trim();
      const companion = document.getElementById('movie-companion').value.trim();

      if (!movieTitle) {
        alert('请填写电影名称。');
        return;
      }

      const editId = form.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const now = new Date();
      const payload = {
        ...(original || {}),
        movieTitle,
        title: movieTitle,
        crew,
        watchDate,
        rating,
        tags,
        review,
        companion,
        content: review,
        date: watchDate || (original ? original.date : formatDate(now)),
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
