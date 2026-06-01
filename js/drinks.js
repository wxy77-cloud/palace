/**
 * 贪杯笔记 - 饮品标签纸模块
 */

(function() {
  'use strict';

  const DRINK_TYPES = {
    yogurt: '酸奶',
    coffee: '咖啡',
    milktea: '奶茶',
    fruittea: '果茶',
    other: '其他'
  };

  const DRINK_ICONS = {
    yogurt: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 16h24v4H20v-4z" fill="#8B7B6B"/>
      <path d="M18 20h28l-4 36H22l-4-36z" fill="#F5F0E6" stroke="#D4C4A8" stroke-width="2"/>
      <ellipse cx="32" cy="56" rx="12" ry="4" fill="#EBE6DA"/>
      <path d="M22 28c0-4 4-8 10-8s10 4 10 8" stroke="#D4C4A8" stroke-width="2" fill="none"/>
    </svg>`,
    coffee: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 24h28v4H16v-4z" fill="#8B7B6B"/>
      <path d="M14 28h32v24c0 4-4 8-8 8H22c-4 0-8-4-8-8V28z" fill="#E8D4B8" stroke="#C4A070" stroke-width="2"/>
      <path d="M46 32h6c4 0 6 2 6 6v4c0 4-2 6-6 6h-6" stroke="#C4A070" stroke-width="2" fill="none"/>
      <path d="M20 36c2-2 6-4 12-4s10 2 12 4" stroke="#C4A070" stroke-width="2" fill="none"/>
    </svg>`,
    milktea: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 12h24v6H20v-6z" fill="#C4A070"/>
      <path d="M18 18h28l-2 38H20l-2-38z" fill="#FFE4C4" stroke="#D4B896" stroke-width="2"/>
      <ellipse cx="32" cy="56" rx="14" ry="4" fill="#FFD8A8"/>
      <circle cx="26" cy="40" r="3" fill="#8B7B6B" opacity="0.3"/>
      <circle cx="34" cy="44" r="2" fill="#8B7B6B" opacity="0.3"/>
      <circle cx="30" cy="48" r="2.5" fill="#8B7B6B" opacity="0.3"/>
    </svg>`,
    fruittea: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 14l8-6 8 6" stroke="#8B7B6B" stroke-width="2" fill="none"/>
      <path d="M20 14h24v4H20v-4z" fill="#8B7B6B"/>
      <path d="M18 18h28l-4 34H22l-4-34z" fill="#FFE0CC" stroke="#FFD0B0" stroke-width="2"/>
      <ellipse cx="32" cy="52" rx="12" ry="4" fill="#FFD0B0"/>
      <circle cx="26" cy="32" r="4" fill="#FF9E80"/>
      <circle cx="36" cy="36" r="3" fill="#FFE082"/>
      <circle cx="30" cy="42" r="3.5" fill="#81C784"/>
    </svg>`,
    other: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 16h20v4H22v-4z" fill="#8B7B6B"/>
      <path d="M20 20h24v32c0 4-4 8-8 8H28c-4 0-8-4-8-8V20z" fill="#E8DCF0" stroke="#DCD0E8" stroke-width="2"/>
      <ellipse cx="32" cy="52" rx="12" ry="4" fill="#DCD0E8"/>
      <path d="M26 28c0-3 3-6 6-6s6 3 6 6" stroke="#C4B7C9" stroke-width="2" fill="none"/>
    </svg>`
  };

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function getStorageKey() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '');
    return `palace_${page}_entries`;
  }

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

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

  function saveEntries(entries) {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.error('保存数据失败:', e);
    }
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
    const fullStar = '★';
    const emptyStar = '☆';
    return fullStar.repeat(rating) + emptyStar.repeat(5 - rating);
  }

  function renderTags() {
    const container = document.getElementById('entries-container');
    const entries = loadEntries();

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="drinks-empty">
          <div class="drinks-empty__icon">🍷</div>
          <p class="drinks-empty__text">暂无记录，点击右下角酒杯添加第一杯珍藏</p>
        </div>
      `;
      return;
    }

    const sortedEntries = [...entries].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    container.innerHTML = `<div class="drink-tags-container">${sortedEntries.map((entry, index) => {
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
    document.querySelectorAll('.drink-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const entryId = tag.dataset.id;
        openDetailModal(entryId);
      });
    });
  }

  function openDetailModal(entryId) {
    const entries = loadEntries();
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const modal = document.getElementById('detail-modal');
    const typeClass = `drink-tag--${entry.type || 'other'}`;
    const icon = DRINK_ICONS[entry.type] || DRINK_ICONS.other;
    const typeLabel = DRINK_TYPES[entry.type] || '其他';

    modal.innerHTML = `
      <button class="drink-modal__close" id="close-detail">&times;</button>
      <div class="drink-modal__header">
        <div class="drink-modal__icon">${icon}</div>
        <h2 class="drink-modal__title">${escapeHtml(entry.name)}</h2>
        <p class="drink-modal__shop">${escapeHtml(entry.shop || '未知店铺')}</p>
        <div class="drink-modal__rating">${generateStars(entry.rating || 0)}</div>
        <span class="drink-modal__type">${typeLabel}</span>
      </div>
      <div class="drink-modal__body">
        <p class="drink-modal__label">品鉴感受</p>
        <p class="drink-modal__notes">${escapeHtml(entry.notes) || '暂无品鉴记录'}</p>
        ${entry.toppings && entry.toppings.length > 0 ? `
          <div class="drink-modal__toppings">
            <p class="drink-modal__label">配料</p>
            <div class="drink-modal__toppings-list">
              ${entry.toppings.split(',').map(t => `<span class="drink-modal__topping">${escapeHtml(t.trim())}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      <div class="drink-modal__footer">
        <span class="drink-modal__date">${entry.date || ''}</span>
        <div class="drink-modal__actions">
          <button class="drink-modal__edit" data-id="${entry.id}">编辑</button>
          <button class="drink-modal__delete" data-id="${entry.id}">删除</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    document.getElementById('close-detail').addEventListener('click', closeDetailModal);
    modal.querySelector('.drink-modal__edit').addEventListener('click', () => {
      closeDetailModal();
      openEditModal(entryId);
    });
    modal.querySelector('.drink-modal__delete').addEventListener('click', () => {
      if (confirm('确定要删除这杯饮品记录吗？')) {
        deleteEntry(entryId);
        closeDetailModal();
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDetailModal();
    });
  }

  function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('active');
  }

  function openAddModal() {
    const modal = document.getElementById('add-modal');
    const form = document.getElementById('drink-form');
    form.reset();
    document.querySelectorAll('.drink-form .star').forEach(s => s.classList.remove('active'));
    modal.classList.add('active');
  }

  function closeAddModal() {
    const modal = document.getElementById('add-modal');
    modal.classList.remove('active');
  }

  function openEditModal(entryId) {
    const entries = loadEntries();
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const modal = document.getElementById('add-modal');
    const form = document.getElementById('drink-form');

    document.getElementById('drink-name').value = entry.name || '';
    document.getElementById('drink-shop').value = entry.shop || '';
    document.getElementById('drink-type').value = entry.type || 'other';
    document.getElementById('drink-notes').value = entry.notes || '';

    document.querySelectorAll('.drink-form .star').forEach((s, i) => {
      if (i < (entry.rating || 0)) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    form.dataset.editId = entryId;
    modal.classList.add('active');
  }

  function deleteEntry(entryId) {
    const entries = loadEntries();
    const index = entries.findIndex(e => e.id === entryId);
    if (index !== -1) {
      entries.splice(index, 1);
      saveEntries(entries);
      renderTags();
    }
  }

  function initStarRating() {
    const starContainers = document.querySelectorAll('.star-rating');
    starContainers.forEach(container => {
      const stars = container.querySelectorAll('.star');
      const input = container.parentElement.querySelector('input[type="hidden"]');

      stars.forEach(star => {
        star.addEventListener('click', () => {
          const value = parseInt(star.dataset.value);
          if (input) input.value = value;
          stars.forEach((s, i) => {
            if (i < value) {
              s.classList.add('active');
            } else {
              s.classList.remove('active');
            }
          });
        });

        star.addEventListener('mouseenter', () => {
          const value = parseInt(star.dataset.value);
          stars.forEach((s, i) => {
            if (i < value) {
              s.style.color = '#DAA520';
            }
          });
        });

        star.addEventListener('mouseleave', () => {
          stars.forEach((s, i) => {
            if (!s.classList.contains('active')) {
              s.style.color = '#C4B8A0';
            }
          });
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

    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) closeAddModal();
    });

    drinkForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('drink-name').value.trim();
      const shop = document.getElementById('drink-shop').value.trim();
      const type = document.getElementById('drink-type').value;
      const rating = parseInt(document.getElementById('drink-rating').value) || 0;
      const notes = document.getElementById('drink-notes').value.trim();

      if (!name) {
        alert('请输入饮品名称');
        return;
      }

      const now = new Date();
      const entries = loadEntries();
      const editId = drinkForm.dataset.editId;

      if (editId) {
        const index = entries.findIndex(e => e.id === editId);
        if (index !== -1) {
          entries[index].name = name;
          entries[index].shop = shop;
          entries[index].type = type;
          entries[index].rating = rating;
          entries[index].notes = notes;
          entries[index].updatedAt = now.toISOString();
          entries[index].editCount = (entries[index].editCount || 0) + 1;
        }
        delete drinkForm.dataset.editId;
      } else {
        entries.push({
          id: generateId(),
          name,
          shop,
          type,
          rating,
          notes,
          date: formatDateTime(now),
          createdAt: now.toISOString(),
          updatedAt: null,
          editCount: 0
        });
      }

      saveEntries(entries);
      closeAddModal();
      renderTags();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
