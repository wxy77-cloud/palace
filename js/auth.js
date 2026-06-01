(function () {
  'use strict';

  const client = window.PalaceDB && window.PalaceDB.client;

  function getRedirectUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '../index.html';
  }

  function setMessage(text, isError) {
    const message = document.getElementById('auth-message');
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('auth-message--error', Boolean(isError));
  }

  async function redirectIfSignedIn() {
    const session = await window.PalaceDB.getSession();
    if (session) {
      window.location.href = getRedirectUrl();
    }
  }

  async function handleAuth(mode) {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
      setMessage('请输入邮箱和密码。', true);
      return;
    }

    setMessage('处理中...', false);

    try {
      const options = { email, password };
      const result = mode === 'signup'
        ? await client.auth.signUp(options)
        : await client.auth.signInWithPassword(options);

      if (result.error) throw result.error;

      if (mode === 'signup' && !result.data.session) {
        setMessage('注册成功，请去邮箱确认后再登录。', false);
        return;
      }

      window.location.href = getRedirectUrl();
    } catch (error) {
      setMessage(error.message || '登录失败，请稍后重试。', true);
    }
  }

  function init() {
    if (!client) {
      setMessage('Supabase SDK 没有加载成功。', true);
      return;
    }

    redirectIfSignedIn();

    document.getElementById('signin-btn').addEventListener('click', () => handleAuth('signin'));
    document.getElementById('signup-btn').addEventListener('click', () => handleAuth('signup'));

    document.getElementById('auth-form').addEventListener('submit', (event) => {
      event.preventDefault();
      handleAuth('signin');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
