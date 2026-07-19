// app.js
(function() {
  // 1. Retrieve CSRF Token from meta tag
  const csrfMeta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

  // Helper to prepend BASE_URL dynamically for proxy support
  function getAbsoluteUrl(url) {
    if (url && url.startsWith('/') && window.BASE_URL) {
      return window.BASE_URL + url.slice(1);
    }
    return url;
  }

  // 2. Global AJAX Fetch Wrapper
  window.AppFetch = async function(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['Content-Type'] = 'application/json';
    if (csrfToken) {
      options.headers['x-csrf-token'] = csrfToken;
    }
    
    try {
      const response = await fetch(getAbsoluteUrl(url), options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error inesperado');
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  // 3. Handle Login Form submit
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    FormValidator.setupAutoClear(loginForm);
    


    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!FormValidator.validateForm(loginForm)) {
        StatusBar.showMessage('POR FAVOR COMPLETE LOS CAMPOS REQUERIDOS', 'warning');
        return;
      }
      
      StatusBar.showMessage('Validando credenciales...', 'info');
      
      const payload = {
        usucod: document.getElementById('usucod').value,
        usucla: document.getElementById('usucla').value,
        captcha: document.getElementById('captcha') ? document.getElementById('captcha').value : '',
        remember: document.getElementById('remember') ? document.getElementById('remember').checked : false
      };
      
      try {
        const res = await AppFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        
        if (payload.remember) {
          localStorage.setItem('remembered_usucod', payload.usucod);
          localStorage.setItem('remember_checked', 'true');
        } else {
          localStorage.removeItem('remembered_usucod');
          localStorage.removeItem('remember_checked');
        }

        StatusBar.showMessage(res.message || 'INGRESO CORRECTO', 'success');
        setTimeout(() => {
          window.location.href = getAbsoluteUrl(res.redirect || '/home');
        }, 800);
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
        refreshCaptcha();
        const captchaInput = document.getElementById('captcha');
        if (captchaInput) {
          captchaInput.value = '';
        }
      }
    });
  }

  // 4. Refresh Captcha Trigger
  const refreshCaptchaBtn = document.getElementById('refreshCaptchaBtn');
  if (refreshCaptchaBtn) {
    refreshCaptchaBtn.addEventListener('click', refreshCaptcha);
  }

  async function refreshCaptcha() {
    try {
      const data = await AppFetch('/api/auth/captcha');
      const qEl = document.getElementById('captchaImage') || document.getElementById('captchaQuestion');
      if (qEl) {
        qEl.innerHTML = data.question;
      }
    } catch (err) {
      console.error('Error refreshing captcha:', err.message);
    }
  }

  // 5. Logout Trigger
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      StatusBar.showMessage('Cerrando sesión...', 'info');
      try {
        const res = await AppFetch('/api/auth/logout', { method: 'POST' });
        window.location.href = getAbsoluteUrl(res.redirect || '/login');
      } catch (err) {
        StatusBar.showMessage('Error al cerrar sesión', 'error');
      }
    });
  }

  // 6. activeAccessSelect change listener
  const activeAccessSelect = document.getElementById('activeAccessSelect');
  if (activeAccessSelect) {
    loadUserContext();

    activeAccessSelect.addEventListener('change', async () => {
      const val = activeAccessSelect.value;
      if (!val) return;
      
      const [empcod, talcod] = val.split('-');
      StatusBar.showMessage('Cambiando contexto de trabajo...', 'info');
      
      try {
        await AppFetch('/api/auth/change-access', {
          method: 'POST',
          body: JSON.stringify({ empcod, talcod })
        });
        
        StatusBar.showMessage('TALLER CAMBIADO CORRECTAMENTE', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  async function loadUserContext() {
    try {
      const data = await AppFetch('/api/auth/me');
      
      if (data.accesses && data.accesses.length > 0) {
        activeAccessSelect.innerHTML = '';
        data.accesses.forEach(acc => {
          const opt = document.createElement('option');
          opt.value = `${acc.empcod}-${acc.talcod}`;
          opt.textContent = `Emp: ${acc.empcod} - Tal: ${acc.talcod}`;
          if (acc.empcod === data.empcod && acc.talcod === data.talcod) {
            opt.selected = true;
          }
          activeAccessSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Error loading user context:', err.message);
    }
  }

  // 7. Database connection check
  const checkDbStatusBtn = document.getElementById('checkDbStatusBtn');
  if (checkDbStatusBtn) {
    checkDbStatusBtn.addEventListener('click', async () => {
      StatusBar.showMessage('Verificando conexión con base de datos...', 'info');
      try {
        const res = await AppFetch('/api/health/db');
        if (res.ok) {
          StatusBar.showMessage('CONEXIÓN DE BASE DE DATOS CORRECTA', 'success');
        } else {
          StatusBar.showMessage('CONEXIÓN DE BASE DE DATOS FALLIDA', 'error');
        }
      } catch (err) {
        StatusBar.showMessage('CONEXIÓN DE BASE DE DATOS INALCANZABLE: ' + err.message, 'error');
      }
    });
  }

  // ===== 8. Hamburger Menu Toggle (Mobile) =====
  const navbar = document.getElementById('mainNavbar');
  const navToggle = document.getElementById('nav-toggle');
  const navPanel = document.getElementById('nav-panel');

  function openNav(){
    navbar?.classList.add('is-open');
    navToggle?.setAttribute('aria-expanded', 'true');
    // create dimmer
    let dim = document.querySelector('.nav-dim');
    if (!dim) {
      dim = document.createElement('div');
      dim.className = 'nav-dim';
      document.body.appendChild(dim);
    }
    requestAnimationFrame(() => dim.classList.add('is-in'));
    dim.onclick = closeNav;
  }
  function closeNav(){
    navbar?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    const dim = document.querySelector('.nav-dim');
    if (dim) dim.classList.remove('is-in');
    // also close dropdown
    closeSegDropdown();
  }
  if (navToggle) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navbar?.classList.contains('is-open') ? closeNav() : openNav();
    });
  }

  // ===== 9. Seguridad Dropdown Toggle =====
  const segDropdown = document.getElementById('segDropdown');
  const segBtn = segDropdown?.querySelector('.nav-link--dropdown');

  function closeSegDropdown(){
    segDropdown?.classList.remove('is-open');
  }

  if (segBtn) {
    segBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      segDropdown.classList.toggle('is-open');
    });
  }

  // Close all on outside click
  document.addEventListener('click', (e) => {
    // close mobile nav
    if (navbar?.classList.contains('is-open') &&
        !navPanel?.contains(e.target) &&
        !navToggle?.contains(e.target)) {
      closeNav();
    }
    // close dropdown
    if (segDropdown?.classList.contains('is-open') &&
        !segDropdown.contains(e.target)) {
      closeSegDropdown();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeNav(); closeSegDropdown(); }
  });
})();
