/**
 * 成就星图 - 星空魔法星星模块
 */

(function() {
  'use strict';

  let stars = [];
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

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
    return `${year}年${month}月${day}日`;
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

  function createStarElement(entry, index, totalCount) {
    const star = document.createElement('div');
    star.className = 'magic-star';
    star.dataset.id = entry.id;

    // 根据总数量调整分布密度，数量越多分布越稀疏
    // 使用更大的网格间距，降低密度
    const gridCols = Math.ceil(Math.sqrt(totalCount * 0.8));
    const gridRows = Math.ceil(totalCount / gridCols);
    const colIndex = index % gridCols;
    const rowIndex = Math.floor(index / gridCols);
    
    // 基础位置（基于网格）- 使用更大的间距范围
    const baseX = 12 + (colIndex / gridCols) * 76;
    const baseY = 12 + (rowIndex / gridRows) * 76;
    
    // 添加随机偏移，使分布更自然
    const offsetX = (Math.random() - 0.5) * 25;
    const offsetY = (Math.random() - 0.5) * 25;
    
    const posX = Math.max(6, Math.min(94, baseX + offsetX));
    const posY = Math.max(6, Math.min(94, baseY + offsetY));
    
    const size = 0.65 + Math.random() * 0.4;
    const rotation = Math.random() * 360;
    const layer = index % 3;

    star.style.cssText = `
      left: ${posX}%;
      top: ${posY}%;
      transform: scale(${size}) rotate(${rotation}deg);
    `;
    star.dataset.layer = layer;

    star.innerHTML = `
      <div class="magic-star__glow"></div>
      <div class="magic-star__ring"></div>
      <div class="magic-star__cross"></div>
      <div class="magic-star__core"></div>
      <div class="magic-star__label">${escapeHtml(entry.title)}</div>
    `;

    return star;
  }

  function renderStars() {
    const container = document.getElementById('stars-container');
    const entries = loadEntries();
    const totalCount = entries.length;

    // 根据星星数量动态调整星空容器高度
    // 基础高度600px，每增加5颗星星增加200px高度
    const baseHeight = 600;
    const heightIncrement = 200;
    const incrementThreshold = 5;
    const adjustedHeight = Math.max(baseHeight, baseHeight + Math.floor((totalCount - incrementThreshold) / incrementThreshold) * heightIncrement);
    
    // 设置容器高度
    container.style.minHeight = `${adjustedHeight}px`;
    
    // 同时设置各层的高度
    const layersHtml = `
      <div class="stars-layer stars-layer--far" style="min-height: ${adjustedHeight}px;"></div>
      <div class="stars-layer stars-layer--mid" style="min-height: ${adjustedHeight}px;"></div>
      <div class="stars-layer stars-layer--near" style="min-height: ${adjustedHeight}px;"></div>
    `;
    container.innerHTML = layersHtml;

    const layers = [
      container.querySelector('.stars-layer--far'),
      container.querySelector('.stars-layer--mid'),
      container.querySelector('.stars-layer--near')
    ];

    if (entries.length === 0) {
      const emptyEl = document.getElementById('achievements-empty');
      if (emptyEl) {
        emptyEl.style.display = 'block';
      }
      return;
    }

    const emptyEl = document.getElementById('achievements-empty');
    if (emptyEl) {
      emptyEl.style.display = 'none';
    }

    const sortedEntries = [...entries].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    stars = [];
    sortedEntries.forEach((entry, index) => {
      const layerIndex = index % 3;
      const star = createStarElement(entry, index, totalCount);
      layers[layerIndex].appendChild(star);
      stars.push({
        element: star,
        entry: entry,
        layer: layerIndex
      });
    });

    bindStarEvents();
  }

  function bindStarEvents() {
    stars.forEach(star => {
      star.element.addEventListener('click', () => {
        openDetailModal(star.entry);
      });
    });
  }

  function openDetailModal(entry) {
    const modal = document.getElementById('achievement-modal');

    modal.innerHTML = `
      <button class="achievement-modal__close">&times;</button>
      <div class="achievement-modal__star">
        <div class="magic-star__glow"></div>
        <div class="magic-star__ring"></div>
        <div class="magic-star__cross"></div>
        <div class="magic-star__core"></div>
      </div>
      <h2 class="achievement-modal__title">${escapeHtml(entry.title)}</h2>
      <p class="achievement-modal__date">${entry.date || ''}</p>
      <div class="achievement-modal__divider"></div>
      <p class="achievement-modal__label">成就描述</p>
      <p class="achievement-modal__description">${escapeHtml(entry.content) || '暂无描述'}</p>
      <div class="achievement-modal__footer">
        <button class="achievement-modal__edit" data-id="${entry.id}">编辑</button>
        <button class="achievement-modal__delete" data-id="${entry.id}">删除</button>
      </div>
    `;

    modal.classList.add('active');

    modal.querySelector('.achievement-modal__close').addEventListener('click', closeDetailModal);
    modal.querySelector('.achievement-modal__edit').addEventListener('click', () => {
      closeDetailModal();
      openEditModal(entry.id);
    });
    modal.querySelector('.achievement-modal__delete').addEventListener('click', () => {
      if (confirm('确定要删除这个成就吗？')) {
        deleteEntry(entry.id);
        closeDetailModal();
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDetailModal();
    });
  }

  function closeDetailModal() {
    const modal = document.getElementById('achievement-modal');
    modal.classList.remove('active');
  }

  function openAddModal() {
    const modal = document.getElementById('add-modal');
    const form = document.getElementById('achievement-form');
    form.reset();
    delete form.dataset.editId;
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
    const form = document.getElementById('achievement-form');

    document.getElementById('achievement-title').value = entry.title || '';
    document.getElementById('achievement-content').value = entry.content || '';

    form.dataset.editId = entryId;
    modal.classList.add('active');
  }

  function deleteEntry(entryId) {
    const entries = loadEntries();
    const index = entries.findIndex(e => e.id === entryId);
    if (index !== -1) {
      entries.splice(index, 1);
      saveEntries(entries);
      renderStars();
    }
  }

  function updateParallax() {
    const layers = [
      { el: document.querySelector('.stars-layer--far'), factor: 0.02 },
      { el: document.querySelector('.stars-layer--mid'), factor: 0.04 },
      { el: document.querySelector('.stars-layer--near'), factor: 0.06 }
    ];

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    layers.forEach(layer => {
      if (layer.el) {
        const moveX = (targetX - window.innerWidth / 2) * layer.factor;
        const moveY = (targetY - window.innerHeight / 2) * layer.factor;
        layer.el.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    });

    requestAnimationFrame(updateParallax);
  }

  function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function init() {
    renderStars();
    updateParallax();

    document.addEventListener('mousemove', handleMouseMove);

    const floatingBtn = document.getElementById('floating-add-btn');
    const addModal = document.getElementById('add-modal');
    const closeAddBtn = document.getElementById('close-add-modal');
    const cancelBtn = document.getElementById('cancel-achievement');
    const form = document.getElementById('achievement-form');

    floatingBtn.addEventListener('click', openAddModal);
    closeAddBtn.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);

    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) closeAddModal();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('achievement-title').value.trim();
      const content = document.getElementById('achievement-content').value.trim();

      if (!title) {
        alert('请输入成就名称');
        return;
      }

      const now = new Date();
      const entries = loadEntries();
      const editId = form.dataset.editId;

      if (editId) {
        const index = entries.findIndex(e => e.id === editId);
        if (index !== -1) {
          entries[index].title = title;
          entries[index].content = content;
          entries[index].updatedAt = now.toISOString();
          entries[index].editCount = (entries[index].editCount || 0) + 1;
        }
        delete form.dataset.editId;
      } else {
        entries.push({
          id: generateId(),
          title,
          content,
          date: formatDateTime(now),
          createdAt: now.toISOString(),
          updatedAt: null,
          editCount: 0
        });
      }

      saveEntries(entries);
      closeAddModal();
      renderStars();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
