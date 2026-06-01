(function () {
  'use strict';

  const SUPABASE_URL = 'https://fcmpphdibnwzqtfuxseu.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_3tMlJhZ6BdaWp92mV3TwEw_LtZDhb6M';
  const LOGIN_PATH = '/pages/login.html';

  function getClient() {
    if (!window.supabase) {
      console.error('Supabase SDK is not loaded.');
      return null;
    }

    if (!window.__palaceSupabaseClient) {
      window.__palaceSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    return window.__palaceSupabaseClient;
  }

  function getLoginUrl() {
    const path = window.location.pathname;
    const isInPages = path.includes('/pages/');
    const loginPath = isInPages ? 'login.html' : 'pages/login.html';
    return `${loginPath}?redirect=${encodeURIComponent(window.location.href)}`;
  }

  function getHomeUrl() {
    return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
  }

  function getPageName() {
    const file = window.location.pathname.split('/').pop() || 'index.html';
    return file.replace('.html', '') || 'index';
  }

  function getPrimaryText(entry) {
    return entry.content || entry.review || entry.notes || entry.description || '';
  }

  function toDbRecord(page, entry, userId) {
    return {
      user_id: userId,
      page,
      title: entry.title || entry.name || 'Untitled',
      content: getPrimaryText(entry),
      data: entry,
      edit_count: entry.editCount || entry.edit_count || 0
    };
  }

  function fromDbRecord(record) {
    const data = record.data || {};
    return {
      ...data,
      id: record.id,
      title: data.title || record.title,
      content: data.content || record.content,
      createdAt: data.createdAt || record.created_at,
      updatedAt: data.updatedAt || record.updated_at,
      editCount: data.editCount ?? record.edit_count ?? 0
    };
  }

  async function getSession() {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
  }

  async function listEntries(page) {
    const client = getClient();
    const user = await getUser();
    if (!client || !user) return [];

    const { data, error } = await client
      .from('entries')
      .select('*')
      .eq('page', page)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if ((!data || data.length === 0) && window.localStorage) {
      const legacyKey = `palace_${page}_entries`;
      const migratedKey = `${legacyKey}_migrated`;
      const legacyValue = window.localStorage.getItem(legacyKey);
      if (legacyValue && !window.localStorage.getItem(migratedKey)) {
        try {
          const legacyEntries = JSON.parse(legacyValue);
          if (Array.isArray(legacyEntries) && legacyEntries.length > 0) {
            const records = legacyEntries.map((entry) => toDbRecord(page, entry, user.id));
            const migrated = await client.from('entries').insert(records).select('*');
            if (migrated.error) throw migrated.error;
            window.localStorage.setItem(migratedKey, new Date().toISOString());
            return (migrated.data || []).map(fromDbRecord);
          }
        } catch (migrationError) {
          console.warn('Legacy localStorage migration failed:', migrationError);
        }
      }
    }

    return (data || []).map(fromDbRecord);
  }

  async function createEntry(page, entry) {
    const client = getClient();
    const user = await getUser();
    if (!client || !user) throw new Error('Please sign in first.');

    const record = toDbRecord(page, entry, user.id);
    const { data, error } = await client
      .from('entries')
      .insert(record)
      .select('*')
      .single();

    if (error) throw error;
    return fromDbRecord(data);
  }

  async function updateEntry(id, entry) {
    const client = getClient();
    if (!client) throw new Error('Supabase client is not ready.');

    const nextEditCount = (entry.editCount || 0) + 1;
    const nextEntry = {
      ...entry,
      editCount: nextEditCount,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await client
      .from('entries')
      .update({
        title: nextEntry.title || nextEntry.name || 'Untitled',
        content: getPrimaryText(nextEntry),
        data: nextEntry,
        edit_count: nextEditCount,
        updated_at: nextEntry.updatedAt
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return fromDbRecord(data);
  }

  async function deleteEntry(id) {
    const client = getClient();
    if (!client) throw new Error('Supabase client is not ready.');

    const { error } = await client.from('entries').delete().eq('id', id);
    if (error) throw error;
  }

  function renderSignedOut(container) {
    container.style.display = 'block';
    container.innerHTML = `
      <div class="auth-required">
        <h2 class="auth-required__title">请先登录</h2>
        <p class="auth-required__text">登录后，你的记录会保存到 Supabase，并且只对自己的账号可见。</p>
        <a class="auth-required__link" href="${getLoginUrl()}">登录 / 注册</a>
      </div>
    `;
  }

  function setControlsEnabled(enabled) {
    document.querySelectorAll('#add-btn, #floating-add-btn, form button, form input, form textarea, form select')
      .forEach((el) => {
        if (el.closest('.auth-card')) return;
        el.disabled = !enabled;
      });
  }

  async function ensureSignedIn(containerId) {
    const user = await getUser();
    if (user) {
      setControlsEnabled(true);
      return user;
    }

    setControlsEnabled(false);
    const container = document.getElementById(containerId || 'entries-container');
    if (container) renderSignedOut(container);
    return null;
  }

  async function signOut() {
    const client = getClient();
    if (!client) return;
    await client.auth.signOut();
    window.location.href = getHomeUrl();
  }

  async function renderAuthBar() {
    if (document.querySelector('.auth-bar')) return;

    const user = await getUser();
    const header = document.querySelector('.page-header, .header');
    if (!header) return;

    const bar = document.createElement('div');
    bar.className = 'auth-bar container';

    if (user) {
      bar.innerHTML = `
        <span class="auth-bar__user">${user.email || 'Signed in'}</span>
        <button class="auth-bar__button" type="button">退出</button>
      `;
      bar.querySelector('button').addEventListener('click', signOut);
    } else {
      bar.innerHTML = `<a class="auth-bar__button" href="${getLoginUrl()}">登录 / 注册</a>`;
    }

    header.insertAdjacentElement('afterend', bar);
  }

  window.PalaceDB = {
    client: getClient(),
    getPageName,
    getSession,
    getUser,
    ensureSignedIn,
    listEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    renderAuthBar,
    signOut,
    loginPath: LOGIN_PATH
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAuthBar);
  } else {
    renderAuthBar();
  }
})();
