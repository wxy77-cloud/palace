(function () {
  'use strict';

  const page = 'friends';
  let entries = [];

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function normalizeTags(rawTags) {
    const tags = Array.isArray(rawTags) ? rawTags : [rawTags];
    return Array.from(new Set(tags
      .flatMap((tag) => String(tag || '').split(/[,，、\s]+/))
      .map((tag) => tag.trim())
      .filter(Boolean)));
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getLampColor(entry) {
    const allowedColors = ['gray', 'gold', 'rose', 'blue', 'green', 'violet', 'ember', 'teal', 'peach', 'moon', 'crimson', 'indigo'];
    return allowedColors.includes(entry.lampColor) ? entry.lampColor : 'gray';
  }

  function getBirthdayState(birthday) {
    if (!birthday) return null;

    const [, month, day] = birthday.split('-').map(Number);
    if (!month || !day) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextBirthday = new Date(today.getFullYear(), month - 1, day);
    if (nextBirthday < today) {
      nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
    }

    const daysUntil = Math.round((nextBirthday - today) / 86400000);
    if (daysUntil === 0) {
      return { className: 'friend-card--birthday-today', text: '今日生辰', tone: 'today' };
    }

    if (daysUntil <= 30) {
      return { className: 'friend-card--birthday-soon', text: `${daysUntil} 天后生辰`, tone: 'soon' };
    }

    return null;
  }

  function getSelectedTags() {
    const selected = Array.from(document.querySelectorAll('.friend-tag-option.active'))
      .map((button) => button.dataset.tag);
    const custom = document.getElementById('friend-custom-tags').value;
    return normalizeTags([...selected, custom]);
  }

  function getSelectedLampColor() {
    const selected = document.querySelector('.friend-color-option.active');
    return selected ? selected.dataset.color : 'gray';
  }

  function setSelectedTags(tags) {
    const normalized = normalizeTags(tags || []);
    document.querySelectorAll('.friend-tag-option').forEach((button) => {
      button.classList.toggle('active', normalized.includes(button.dataset.tag));
    });

    const presetTags = Array.from(document.querySelectorAll('.friend-tag-option'))
      .map((button) => button.dataset.tag);
    const customTags = normalized.filter((tag) => !presetTags.includes(tag));
    document.getElementById('friend-custom-tags').value = customTags.join('，');
  }

  function setSelectedLampColor(color) {
    const selectedColor = color || 'gray';
    document.querySelectorAll('.friend-color-option').forEach((button) => {
      button.classList.toggle('active', button.dataset.color === selectedColor);
    });
  }

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
    setSelectedTags([]);
    setSelectedLampColor('gray');
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
      document.getElementById('friend-name').value = entry.friendName || entry.title || '';
      document.getElementById('friend-real-name').value = entry.realName || '';
      document.getElementById('friend-relationship').value = entry.relationship || '';
      document.getElementById('friend-birthday').value = entry.birthday || '';
      document.getElementById('friend-contact').value = entry.contact || '';
      document.getElementById('friend-met').value = entry.met || '';
      document.getElementById('friend-preferences').value = entry.preferences || '';
      document.getElementById('friend-notes').value = entry.notes || entry.content || '';
      setSelectedTags(entry.tags || []);
      setSelectedLampColor(entry.lampColor);
    } else {
      resetForm();
    }

    document.getElementById('friend-name').focus();
  }

  function renderField(label, value) {
    if (!value) return '';
    return `
      <div class="friend-postcard__field">
        <span>${label}</span>
        <p>${escapeHtml(value)}</p>
      </div>
    `;
  }

  function closePostcard() {
    const postcard = document.querySelector('.friend-postcard-overlay');
    if (postcard) postcard.remove();
  }

  function openPostcard(entry) {
    if (!entry) return;

    closePostcard();

    const tags = normalizeTags(entry.tags || []);
    const displayName = entry.friendName || entry.title || '未命名来客';
    const birthdayState = getBirthdayState(entry.birthday);
    const overlay = document.createElement('div');
    overlay.className = 'friend-postcard-overlay';
    overlay.innerHTML = `
      <article class="friend-postcard" role="dialog" aria-modal="true" aria-labelledby="friend-postcard-title">
        <button class="friend-postcard__close" type="button" aria-label="关闭明信片">×</button>
        <div class="friend-postcard__stamp" aria-hidden="true">缘</div>
        <div class="friend-postcard__front">
          <p class="friend-postcard__eyebrow">一张寄存在驿站的明信片</p>
          <h2 id="friend-postcard-title" class="friend-postcard__title">${escapeHtml(displayName)}</h2>
          <p class="friend-postcard__subtitle">${escapeHtml(entry.realName || entry.relationship || '未记录更多称呼')}</p>
          <div class="friend-postcard__meta">
            ${birthdayState ? `<span class="friend-card__birthday-badge friend-card__birthday-badge--${birthdayState.tone}">🏮 ${escapeHtml(birthdayState.text)}</span>` : ''}
            ${entry.birthday ? `<span>生日 ${escapeHtml(entry.birthday)}</span>` : ''}
          </div>
          ${renderField('联系方式', entry.contact)}
          ${tags.length > 0 ? `<div class="friend-card__tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="friend-postcard__message">
          ${renderField('关系', entry.relationship)}
          ${renderField('初识', entry.met)}
          ${renderField('偏好 / 雷区', entry.preferences)}
          ${renderField('近况 / 备注', entry.notes || entry.content)}
        </div>
        <div class="friend-postcard__footer">
          <span class="friend-card__edit-count">编辑 ${entry.editCount || 0} 次</span>
          <div class="friend-card__actions">
            <button class="friend-edit-btn" type="button">编辑</button>
            <button class="friend-delete-btn" type="button">删除</button>
          </div>
        </div>
      </article>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closePostcard();
    });

    overlay.querySelector('.friend-postcard__close').addEventListener('click', closePostcard);
    overlay.querySelector('.friend-edit-btn').addEventListener('click', () => {
      closePostcard();
      openForm(entry);
    });
    overlay.querySelector('.friend-delete-btn').addEventListener('click', async () => {
      if (!confirm('确定要删除这位友人的记录吗？')) return;
      try {
        await window.PalaceDB.deleteEntry(entry.id);
        closePostcard();
        await renderEntries();
      } catch (error) {
        alert(error.message || '删除失败。');
      }
    });
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
        <div class="empty-state friend-empty-state">
          <div class="empty-state__icon">🕯</div>
          <p class="empty-state__text">驿站还未点灯，点击上方按钮迎来第一位来客。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="friend-list">
        ${entries.map((entry) => {
          const displayName = entry.friendName || entry.title || '未命名来客';
          const lampColor = getLampColor(entry);
          const birthdayState = getBirthdayState(entry.birthday);
          const birthdayClass = birthdayState ? ` ${birthdayState.className}` : '';
          return `
            <article class="friend-card friend-card--${lampColor}${birthdayClass}" data-id="${escapeHtml(entry.id)}" tabindex="0" role="button">
              <div class="friend-card__paper-boat">
                <span class="friend-card__candle" aria-hidden="true">
                  <span class="friend-card__flame"></span>
                </span>
                <span class="friend-card__boat" aria-hidden="true">
                  <span class="friend-card__fold friend-card__fold--left"></span>
                  <span class="friend-card__fold friend-card__fold--right"></span>
                  <span class="friend-card__fold friend-card__fold--front-left"></span>
                  <span class="friend-card__fold friend-card__fold--front-right"></span>
                </span>
                <span class="friend-card__water" aria-hidden="true"></span>
                <span class="friend-card__reflection" aria-hidden="true"></span>
                <h2 class="friend-card__name">${escapeHtml(displayName)}</h2>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    bindEntryEvents();
  }

  function bindEntryEvents() {
    document.querySelectorAll('.friend-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.addEventListener('click', () => openPostcard(entry));

      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openPostcard(entry);
      });
    });
  }

  function initTagOptions() {
    document.querySelectorAll('.friend-tag-option').forEach((button) => {
      button.addEventListener('click', () => button.classList.toggle('active'));
    });
  }

  function initLampColorOptions() {
    document.querySelectorAll('.friend-color-option').forEach((button) => {
      button.addEventListener('click', () => setSelectedLampColor(button.dataset.color));
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const form = document.getElementById('input-form');
    const cancelBtn = document.getElementById('cancel-form');

    initTagOptions();
    initLampColorOptions();
    renderEntries();

    addBtn.addEventListener('click', () => openForm());
    cancelBtn.addEventListener('click', closeForm);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePostcard();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const friendName = document.getElementById('friend-name').value.trim();
      const realName = document.getElementById('friend-real-name').value.trim();
      const relationship = document.getElementById('friend-relationship').value.trim();
      const birthday = document.getElementById('friend-birthday').value;
      const contact = document.getElementById('friend-contact').value.trim();
      const met = document.getElementById('friend-met').value.trim();
      const tags = getSelectedTags();
      const lampColor = getSelectedLampColor();
      const preferences = document.getElementById('friend-preferences').value.trim();
      const notes = document.getElementById('friend-notes').value.trim();

      if (!friendName) {
        alert('请填写友人的称呼。');
        return;
      }

      const editId = form.dataset.editId;
      const original = entries.find((item) => item.id === editId);
      const now = new Date();
      const contentParts = [relationship, met, preferences, notes].filter(Boolean);
      const payload = {
        ...(original || {}),
        friendName,
        title: friendName,
        realName,
        relationship,
        birthday,
        contact,
        met,
        tags,
        lampColor,
        preferences,
        notes,
        content: contentParts.join('\n\n') || realName || friendName,
        date: original ? original.date : formatDate(now),
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
