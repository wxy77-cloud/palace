(function () {
  'use strict';

  const page = 'achievements';
  let stars = [];
  let entries = [];
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
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

    const gridCols = Math.ceil(Math.sqrt(totalCount * 0.8));
    const gridRows = Math.ceil(totalCount / gridCols);
    const colIndex = index % gridCols;
    const rowIndex = Math.floor(index / gridCols);
    const baseX = 12 + (colIndex / gridCols) * 76;
    const baseY = 12 + (rowIndex / gridRows) * 76;
    const offsetX = ((index * 37) % 25) - 12;
    const offsetY = ((index * 53) % 25) - 12;
    const posX = Math.max(6, Math.min(94, baseX + offsetX));
    const posY = Math.max(6, Math.min(94, baseY + offsetY));
    const size = 0.65 + (index % 5) * 0.08;
    const rotation = (index * 47) % 360;
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

  async function renderStars() {
    const container = document.getElementById('stars-container');
    const user = await window.PalaceDB.ensureSignedIn('achievements-empty');
    if (!container || !user) return;

    try {
      entries = await window.PalaceDB.listEntries(page);
    } catch (error) {
      const emptyEl = document.getElementById('achievements-empty');
      if (emptyEl) {
        emptyEl.style.display = 'block';
        emptyEl.innerHTML = `<p class="achievements-empty__text">${escapeHtml(error.message || '加载失败。')}</p>`;
      }
      return;
    }

    const totalCount = entries.length;
    const baseHeight = 600;
    const adjustedHeight = Math.max(baseHeight, baseHeight + Math.floor((totalCount - 5) / 5) * 200);
    container.style.minHeight = `${adjustedHeight}px`;
    container.innerHTML = `
      <div class="stars-layer stars-layer--far" style="min-height: ${adjustedHeight}px;"></div>
      <div class="stars-layer stars-layer--mid" style="min-height: ${adjustedHeight}px;"></div>
      <div class="stars-layer stars-layer--near" style="min-height: ${adjustedHeight}px;"></div>
    `;

    const emptyEl = document.getElementById('achievements-empty');
    if (emptyEl) emptyEl.style.display = entries.length ? 'none' : 'block';
    if (entries.length === 0) return;

    const layers = [
      container.querySelector('.stars-layer--far'),
      container.querySelector('.stars-layer--mid'),
      container.querySelector('.stars-layer--near')
    ];

    stars = [];
    entries.forEach((entry, index) => {
      const layerIndex = index % 3;
      const star = createStarElement(entry, index, totalCount);
      layers[layerIndex].appendChild(star);
      stars.push({ element: star, entry, layer: layerIndex });
    });

    bindStarEvents();
  }

  function bindStarEvents() {
    stars.forEach((star) => {
      star.element.addEventListener('click', () => openDetailModal(star.entry));
    });
  }

  function openDetailModal(entry) {
    const modal = document.getElementById('achievement-modal');
    modal.innerHTML = `
      <button class="achievement-modal__close" type="button">&times;</button>
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
        <button class="achievement-modal__edit" data-id="${entry.id}" type="button">编辑</button>
        <button class="achievement-modal__delete" data-id="${entry.id}" type="button">删除</button>
      </div>
    `;

    modal.classList.add('active');
    modal.querySelector('.achievement-modal__close').addEventListener('click', closeDetailModal);
    modal.querySelector('.achievement-modal__edit').addEventListener('click', () => {
      closeDetailModal();
      openEditModal(entry.id);
    });
    modal.querySelector('.achievement-modal__delete').addEventListener('click', async () => {
      if (!confirm('确定要删除这个成就吗？')) return;
      await deleteEntry(entry.id);
      closeDetailModal();
    });
  }

  function closeDetailModal() {
    document.getElementById('achievement-modal').classList.remove('active');
  }

  function openAddModal() {
    const form = document.getElementById('achievement-form');
    form.reset();
    delete form.dataset.editId;
    document.getElementById('add-modal').classList.add('active');
  }

  function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
  }

  function openEditModal(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    document.getElementById('achievement-title').value = entry.title || '';
    document.getElementById('achievement-content').value = entry.content || '';
    document.getElementById('achievement-form').dataset.editId = entryId;
    document.getElementById('add-modal').classList.add('active');
  }

  async function deleteEntry(entryId) {
    try {
      await window.PalaceDB.deleteEntry(entryId);
      await renderStars();
    } catch (error) {
      alert(error.message || '删除失败。');
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

    layers.forEach((layer) => {
      if (layer.el) {
        const moveX = (targetX - window.innerWidth / 2) * layer.factor;
        const moveY = (targetY - window.innerHeight / 2) * layer.factor;
        layer.el.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    });

    requestAnimationFrame(updateParallax);
  }

  function init() {
    renderStars();
    updateParallax();
    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    const floatingBtn = document.getElementById('floating-add-btn');
    const addModal = document.getElementById('add-modal');
    const closeAddBtn = document.getElementById('close-add-modal');
    const cancelBtn = document.getElementById('cancel-achievement');
    const form = document.getElementById('achievement-form');

    floatingBtn.addEventListener('click', openAddModal);
    closeAddBtn.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);
    addModal.addEventListener('click', (event) => {
      if (event.target === addModal) closeAddModal();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const title = document.getElementById('achievement-title').value.trim();
      const content = document.getElementById('achievement-content').value.trim();
      if (!title) {
        alert('请输入成就名称。');
        return;
      }

      const now = new Date();
      const editId = form.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const payload = {
        ...(original || {}),
        title,
        content,
        date: original ? original.date : formatDateTime(now),
        createdAt: original ? original.createdAt : now.toISOString()
      };

      try {
        if (editId) {
          await window.PalaceDB.updateEntry(editId, payload);
          delete form.dataset.editId;
        } else {
          await window.PalaceDB.createEntry(page, { ...payload, editCount: 0 });
        }
        closeAddModal();
        await renderStars();
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
