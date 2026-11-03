
(async function () {
  const state = document.getElementById('cloudstate');
  const error = document.getElementById('autherror');
  const authscreen = document.getElementById('authscreen');
  const loginform = document.getElementById('loginform');
  const logout = document.getElementById('logout');

  const url = window.TEX_SUPABASE_URL;
  const anon = window.TEX_SUPABASE_ANON_KEY;

  function showError(message) {
    console.error('[Financeiro 3.1]', message);
    if (error) error.textContent = message;
  }

  function showLogin() {
    document.body.classList.add('locked');
    if (authscreen) authscreen.style.display = 'flex';
  }

  function showDashboard() {
    document.body.classList.remove('locked');
    if (authscreen) authscreen.style.display = 'none';
  }

  if (!url || !anon) {
    showError('Configuração do Supabase não encontrada. Verifique config.js.');
    return;
  }

  if (!window.supabase) {
    showError('Biblioteca do Supabase não carregada.');
    return;
  }

  if (!loginform) {
    showError('Formulário de login não encontrado no HTML.');
    return;
  }

  const client = window.supabase.createClient(url, anon, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });

  let user = null;
  let saveQueue = Promise.resolve();
  let version = 0;

  async function load() {
    try {
      if (state) state.textContent = 'Verificando autenticação...';

      const { data, error: authError } = await client.auth.getUser();

      if (authError || !data?.user) {
        user = null;
        showLogin();
        if (state) state.textContent = 'Desconectado';
        return;
      }

      user = data.user;

      if (state) state.textContent = 'Carregando dados...';

      const result = await client
        .from('financeiro_workspace')
        .select('payload')
        .eq('user_id', user.id)
        .maybeSingle();

      if (result.error) {
        showLogin();
        showError('Erro ao consultar banco: ' + result.error.message);
        return;
      }

      if (typeof initial === 'undefined') {
        showLogin();
        showError('Base inicial não encontrada no sistema.');
        return;
      }

      db = result.data?.payload || structuredClone(initial);

      showDashboard();

      if (error) error.textContent = '';

      if (state) {
        state.textContent = result.data
          ? '● Nuvem conectada'
          : '● Base vazia — importe seu backup';
      }

      if (typeof render === 'function') {
        render();
      } else {
        showError('Função render() não encontrada.');
      }

    } catch (err) {
      showLogin();
      showError('Erro ao carregar sistema: ' + err.message);
    }
  }

  window.cloudSave = function () {
    if (!user) {
      alert('Faça login novamente.');
      return;
    }

    const snapshot = JSON.parse(JSON.stringify(db));
    const id = user.id;
    const current = ++version;

    if (state) state.textContent = 'Salvando...';

    saveQueue = saveQueue
      .catch(() => {})
      .then(async () => {
        const { error: saveError } = await client
          .from('financeiro_workspace')
          .upsert({
            user_id: id,
            payload: snapshot,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (saveError) {
          if (state) state.textContent = '⚠ Erro ao salvar';
          alert('Dados NÃO salvos: ' + saveError.message);
          throw saveError;
        }

        if (current === version && state) {
          state.textContent = '● Salvo na nuvem';
        }
      });
  };

  loginform.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('loginemail')?.value.trim();
    const password = document.getElementById('loginpassword')?.value;
    const button = loginform.querySelector('button[type="submit"]');

    if (!email || !password) {
      showError('Preencha seu e-mail e senha.');
      return;
    }

    try {
      if (button) button.disabled = true;
      if (error) error.textContent = 'Autenticando...';

      const { data, error: loginError } =
        await client.auth.signInWithPassword({
          email: email,
          password: password
        });

      if (loginError) {
        showError('Erro no login: ' + loginError.message);
        return;
      }

      if (!data?.user) {
        showError('Login não retornou um usuário válido.');
        return;
      }

      if (error) error.textContent = '';

      await load();

    } catch (err) {
      showError('Falha de autenticação: ' + err.message);
    } finally {
      if (button) button.disabled = false;
    }
  });

  if (logout) {
    logout.onclick = async function () {
      try {
        await saveQueue.catch(() => {});
        const { error: signOutError } = await client.auth.signOut();

        if (signOutError) {
          showError('Erro ao sair: ' + signOutError.message);
          return;
        }

        user = null;
        db = structuredClone(initial);
        showLogin();

        if (state) state.textContent = 'Desconectado';

      } catch (err) {
        showError('Erro ao sair: ' + err.message);
      }
    };
  }

  await load();

})();

