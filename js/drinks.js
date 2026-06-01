(function () {
  'use strict';

  const page = 'drinks';
  const DRINK_TYPES = {
    yogurt: '酸奶',
    coffee: '咖啡',
    milktea: '奶茶',
    fruittea: '果茶',
    other: '其他'
  };

  const DRINK_ICONS = {
    yogurt: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 16h24v4H20v-4z" fill="#8B7B6B"/><path d="M18 20h28l-4 36H22l-4-36z" fill="#F5F0E6" stroke="#D4C4A8" stroke-width="2"/></svg>',
    coffee: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 24h28v4H16v-4z" fill="#8B7B6B"/><path d="M14 28h32v24c0 4-4 8-8 8H22c-4 0-8-4-8-8V28z" fill="#E8D4B8" stroke="#C4A070" stroke-width="2"/><path d="M46 32h6c4 0 6 2 6 6v4c0 4-2 6-6 6h-6" stroke="#C4A070" stroke-width="2"/></svg>',
    milktea: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12h24v6H20v-6z" fill="#C4A070"/><path d="M18 18h28l-2 38H20l-2-38z" fill="#FFE4C4" stroke="#D4B896" stroke-width="2"/></svg>',
    fruittea: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 14h24v4H20v-4z" fill="#8B7B6B"/><path d="M18 18h28l-4 34H22l-4-34z" fill="#FFE0CC" stroke="#FFD0B0" stroke-width="2"/><circle cx="26" cy="32" r="4" fill="#FF9E80"/></svg>',
    other: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16h20v4H22v-4z" fill="#8B7B6B"/><path d="M20 20h24v32c0 4-4 8-8 8H28c-4 0-8-4-8-8V20z" fill="#E8DCF0" stroke="#DCD0E8" stroke-width="2"/></svg>'
  };

  let entries = [];

  function formatDateTime(date) {
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

  function getRandomRotation(index) {
    const rotations = [-5, -3, 2, 4, -2, 3, -4, 1, -1, 5];
    return rotations[index % rotations.length];
  }

  function generateStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  async function renderTags() {
    const container = document.getElementById('entries-container');
    const user = await window.PalaceDB.ensureSignedIn('entries-container');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      container.innerHTML = `<div class="drinks-empty"><p>${escapeHtml(error.message || '加载失败。')}</p></div>`;
      return;
    }

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="drinks-empty">
          <div class="drinks-empty__icon">☕</div>
          <p class="drinks-empty__text">暂无记录，点击右下角杯子添加第一杯珍藏。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="drink-tags-container">${entries.map((entry, index) => {
      const rotation = getRandomRotation(index);
      const typeClass = `drink-tag--${entry.type || 'other'}`;
      const icon = DRINK_ICONS[entry.type] || DRINK_ICONS.other;
      const typeLabel = DRINK_TYPES[entry.type] || '其他';

      return `
        <div class="drink-tag ${typeClass}" data-id="${escapeHtml(entry.id)}" style="transform: rotate(${rotation}deg)">
          <div class="drink-tag__icon">${icon}</div>
          <div class="drink-tag__name">${escapeHtml(entry.name)}</div>
          <div class="drink-tag__shop">${escapeHtml(entry.shop || '未知店铺')}</div>
          <div class="drink-tag__rating">${generateStars(entry.rating || 0)}</div>
          <span class="drink-tag__type-badge">${typeLabel}</span>
        </div>
      `;
    }).join('')}</div>`;

    bindTagEvents();
  }

  function bindTagEvents() {
    document.querySelectorAll('.drink-tag').forEach((tag) => {
      tag.addEventListener('click', () => openDetailModal(tag.dataset.id));
    });
  }

  function openDetailModal(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const modal = document.getElementById('detail-modal');
    const icon = DRINK_ICONS[entry.type] || DRINK_ICONS.other;
    const typeLabel = DRINK_TYPES[entry.type] || '其他';

    modal.innerHTML = `
      <button class="drink-modal__close" id="close-detail" type="button">&times;</button>
      <div class="drink-modal__header">
        <div class="drink-modal__icon">${icon}</div>
        <h2 class="drink-modal__title">${escapeHtml(entry.name)}</h2>
        <p class="drink-modal__shop">${escapeHtml(entry.shop || '未知店铺')}</p>
        <div class="drink-modal__rating">${generateStars(entry.rating || 0)}</div>
        <span class="drink-modal__type">${typeLabel}</span>
      </div>
      <div class="drink-modal__body">
        <p class="drink-modal__label">品尝感受</p>
        <p class="drink-modal__notes">${escapeHtml(entry.notes) || '暂无品尝记录'}</p>
      </div>
      <div class="drink-modal__footer">
        <span class="drink-modal__date">${entry.date || ''}</span>
        <div class="drink-modal__actions">
          <button class="drink-modal__edit" data-id="${entry.id}" type="button">编辑</button>
          <button class="drink-modal__delete" data-id="${entry.id}" type="button">删除</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.getElementById('close-detail').addEventListener('click', closeDetailModal);
    modal.querySelector('.drink-modal__edit').addEventListener('click', () => {
      closeDetailModal();
      openEditModal(entryId);
    });
    modal.querySelector('.drink-modal__delete').addEventListener('click', async () => {
      if (!confirm('确定要删除这杯饮品记录吗？')) return;
      await deleteEntry(entryId);
      closeDetailModal();
    });
  }

  function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
  }

  function openAddModal() {
    const modal = document.getElementById('add-modal');
    const form = document.getElementById('drink-form');
    form.reset();
    delete form.dataset.editId;
    document.querySelectorAll('.drink-form .star').forEach((star) => star.classList.remove('active'));
    document.getElementById('drink-rating').value = 0;
    modal.classList.add('active');
  }

  function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
  }

  function openEditModal(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    document.getElementById('drink-name').value = entry.name || '';
    document.getElementById('drink-shop').value = entry.shop || '';
    document.getElementById('drink-type').value = entry.type || 'other';
    document.getElementById('drink-notes').value = entry.notes || '';
    document.getElementById('drink-rating').value = entry.rating || 0;
    document.querySelectorAll('.drink-form .star').forEach((star, index) => {
      star.classList.toggle('active', index < (entry.rating || 0));
    });

    document.getElementById('drink-form').dataset.editId = entryId;
    document.getElementById('add-modal').classList.add('active');
  }

  async function deleteEntry(entryId) {
    try {
      await window.PalaceDB.deleteEntry(entryId);
      await renderTags();
    } catch (error) {
      alert(error.message || '删除失败。');
    }
  }

  function initStarRating() {
    document.querySelectorAll('.star-rating').forEach((container) => {
      const stars = container.querySelectorAll('.star');
      const input = container.parentElement.querySelector('input[type="hidden"]');

      stars.forEach((star) => {
        star.addEventListener('click', () => {
          const value = parseInt(star.dataset.value, 10);
          if (input) input.value = value;
          stars.forEach((item, index) => item.classList.toggle('active', index < value));
        });
      });
    });
  }

  function init() {
    renderTags();
    initStarRating();

    const floatingBtn = document.getElementById('floating-add-btn');
    const addModal = document.getElementById('add-modal');
    const closeAddBtn = document.getElementById('close-add-modal');
    const cancelAddBtn = document.getElementById('cancel-drink');
    const drinkForm = document.getElementById('drink-form');

    floatingBtn.addEventListener('click', openAddModal);
    closeAddBtn.addEventListener('click', closeAddModal);
    cancelAddBtn.addEventListener('click', closeAddModal);
    addModal.addEventListener('click', (event) => {
      if (event.target === addModal) closeAddModal();
    });

    drinkForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = document.getElementById('drink-name').value.trim();
      const shop = document.getElementById('drink-shop').value.trim();
      const type = document.getElementById('drink-type').value;
      const rating = parseInt(document.getElementById('drink-rating').value, 10) || 0;
      const notes = document.getElementById('drink-notes').value.trim();

      if (!name) {
        alert('请输入饮品名称。');
        return;
      }

      const now = new Date();
      const editId = drinkForm.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const payload = {
        ...(original || {}),
        name,
        title: name,
        shop,
        type,
        rating,
        notes,
        content: notes,
        date: original ? original.date : formatDateTime(now),
        createdAt: original ? original.createdAt : now.toISOString()
      };

      try {
        if (editId) {
          await window.PalaceDB.updateEntry(editId, payload);
          delete drinkForm.dataset.editId;
        } else {
          await window.PalaceDB.createEntry(page, { ...payload, editCount: 0 });
        }
        closeAddModal();
        await renderTags();
      } catch (error) {
        alert(error.message || '保存失败。');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
