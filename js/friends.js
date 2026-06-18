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

  function formatDisplayDate(value) {
    if (!value) return '未记年岁';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDate(date);
  }

  function getLampTone(tags) {
    if (tags.includes('家人')) return 'ember';
    if (tags.includes('挚友') || tags.includes('可靠')) return 'gold';
    if (tags.includes('网友') || tags.includes('游戏')) return 'blue';
    if (tags.includes('旅行')) return 'green';
    if (tags.includes('饭搭子')) return 'rose';
    return 'violet';
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

  function getJourneyDate(entry) {
    return entry.createdAt || entry.date || entry.birthday || '';
  }

  function getJourneyTime(entry) {
    const date = new Date(getJourneyDate(entry));
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }

  function renderTimeline() {
    const timelineItems = entries
      .slice()
      .sort((a, b) => getJourneyTime(a) - getJourneyTime(b))
      .map((entry, index) => {
        const name = entry.friendName || entry.title || '未命名来客';
        const dateText = formatDisplayDate(getJourneyDate(entry));
        return `
          <div class="journey-timeline__item">
            <span class="journey-timeline__lamp" aria-hidden="true"></span>
            <span class="journey-timeline__date">${escapeHtml(dateText)}</span>
            <span class="journey-timeline__name">${escapeHtml(name)}</span>
            <span class="journey-timeline__step">${index + 1}</span>
          </div>
        `;
      })
      .join('');

    return `
      <section class="journey-timeline" aria-label="旅途时间线">
        <div class="journey-timeline__header">
          <h2>旅途时间线</h2>
          <p>每一次记录，都是驿路上新点起的一盏灯。</p>
        </div>
        <div class="journey-timeline__track">
          ${timelineItems}
        </div>
      </section>
    `;
  }

  function getSelectedTags() {
    const selected = Array.from(document.querySelectorAll('.friend-tag-option.active'))
      .map((button) => button.dataset.tag);
    const custom = document.getElementById('friend-custom-tags').value;
    return normalizeTags([...selected, custom]);
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

  function resetForm() {
    const form = document.getElementById('input-form');
    form.reset();
    delete form.dataset.editId;
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
      document.getElementById('friend-name').value = entry.friendName || entry.title || '';
      document.getElementById('friend-real-name').value = entry.realName || '';
      document.getElementById('friend-relationship').value = entry.relationship || '';
      document.getElementById('friend-birthday').value = entry.birthday || '';
      document.getElementById('friend-contact').value = entry.contact || '';
      document.getElementById('friend-met').value = entry.met || '';
      document.getElementById('friend-preferences').value = entry.preferences || '';
      document.getElementById('friend-notes').value = entry.notes || entry.content || '';
      setSelectedTags(entry.tags || []);
    } else {
      resetForm();
    }

    document.getElementById('friend-name').focus();
  }

  function renderField(label, value) {
    if (!value) return '';
    return `
      <div class="friend-card__field">
        <span>${label}</span>
        <p>${escapeHtml(value)}</p>
      </div>
    `;
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
      ${renderTimeline()}
      <div class="friend-list">
        ${entries.map((entry) => {
          const tags = normalizeTags(entry.tags || []);
          const initials = (entry.friendName || entry.title || '?').trim().slice(0, 2);
          const lampTone = getLampTone(tags);
          const birthdayState = getBirthdayState(entry.birthday);
          const birthdayClass = birthdayState ? ` ${birthdayState.className}` : '';
          return `
            <article class="friend-card friend-card--${lampTone}${birthdayClass}" data-id="${escapeHtml(entry.id)}">
              <div class="friend-card__lamp" aria-hidden="true">
                <span class="friend-card__flame"></span>
                <span class="friend-card__avatar">${escapeHtml(initials)}</span>
              </div>
              <div class="friend-card__main">
                <div class="friend-card__header">
                  <div>
                    <h2 class="friend-card__name">${escapeHtml(entry.friendName || entry.title)}</h2>
                    <p class="friend-card__subtitle">${escapeHtml(entry.realName || entry.relationship || '未记录更多称呼')}</p>
                  </div>
                  <div class="friend-card__dates">
                    ${birthdayState ? `<span class="friend-card__birthday-badge friend-card__birthday-badge--${birthdayState.tone}">🏮 ${escapeHtml(birthdayState.text)}</span>` : ''}
                    ${entry.birthday ? `<span class="friend-card__date">生日 ${escapeHtml(entry.birthday)}</span>` : ''}
                  </div>
                </div>
                ${tags.length > 0 ? `<div class="friend-card__tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                <div class="friend-card__fields">
                  ${renderField('关系', entry.relationship)}
                  ${renderField('联系方式', entry.contact)}
                  ${renderField('初识', entry.met)}
                  ${renderField('偏好 / 雷区', entry.preferences)}
                  ${renderField('近况 / 备注', entry.notes || entry.content)}
                </div>
                <div class="friend-card__footer">
                  <span class="friend-card__edit-count">编辑 ${entry.editCount || 0} 次</span>
                  <div class="friend-card__actions">
                    <button class="friend-edit-btn" type="button">编辑</button>
                    <button class="friend-delete-btn" type="button">删除</button>
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
    document.querySelectorAll('.friend-card').forEach((card) => {
      const entry = entries.find((item) => item.id === card.dataset.id);
      card.querySelector('.friend-edit-btn').addEventListener('click', () => openForm(entry));
      card.querySelector('.friend-delete-btn').addEventListener('click', async () => {
        if (!entry || !confirm('确定要删除这位友人的记录吗？')) return;
        try {
          await window.PalaceDB.deleteEntry(entry.id);
          await renderEntries();
        } catch (error) {
          alert(error.message || '删除失败。');
        }
      });
    });
  }

  function initTagOptions() {
    document.querySelectorAll('.friend-tag-option').forEach((button) => {
      button.addEventListener('click', () => button.classList.toggle('active'));
    });
  }

  function init() {
    const addBtn = document.getElementById('add-btn');
    const form = document.getElementById('input-form');
    const cancelBtn = document.getElementById('cancel-form');

    initTagOptions();
    renderEntries();

    addBtn.addEventListener('click', () => openForm());
    cancelBtn.addEventListener('click', closeForm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const friendName = document.getElementById('friend-name').value.trim();
      const realName = document.getElementById('friend-real-name').value.trim();
      const relationship = document.getElementById('friend-relationship').value.trim();
      const birthday = document.getElementById('friend-birthday').value;
      const contact = document.getElementById('friend-contact').value.trim();
      const met = document.getElementById('friend-met').value.trim();
      const tags = getSelectedTags();
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
