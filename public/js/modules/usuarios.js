// usuarios.js
(function() {
  const tableBody = document.getElementById('usr-tbody');
  const searchInput = document.getElementById('q');
  
  // Form fields
  const usuarioForm = document.getElementById('usuarioForm');
  const f_usucod = document.getElementById('f-usucod');
  const f_usunom = document.getElementById('f-usunom');
  const f_usumail = document.getElementById('f-usumail');
  const f_usucla = document.getElementById('f-usucla');
  const f_usuadm = document.getElementById('f-usuadm');
  
  const passwordGroup = document.getElementById('passwordGroup');
  const changePasswordGroup = document.getElementById('changePasswordGroup');
  const f_newpass = document.getElementById('f-newpass');
  const btnUpdatePass = document.getElementById('btnUpdatePass');
  
  // Side Action Buttons
  const btnNew = document.getElementById('btn-new');
  const btnSave = document.getElementById('btn-save');
  const btnAnular = document.getElementById('btn-anular');
  const btnAcc = document.getElementById('btn-acc');
  const btnCancel = document.getElementById('btn-cancel');
  const btnDelete = document.getElementById('btn-delete');

  let isEditing = false;
  let cachedUsers = [];
  let selectedUserCode = null;

  // Track original values to detect changes
  let originalValues = {
    usucod: '',
    usunom: '',
    usumail: '',
    usuadm: false
  };

  function checkForChanges() {
    if (!btnSave) return;
    const codeVal = (f_usucod.value || '').trim();
    const nomVal = (f_usunom.value || '').trim();
    const mailVal = (f_usumail.value || '').trim();
    const admVal = !!f_usuadm.checked;

    if (!isEditing) {
      // In creation: enable if base fields are populated
      const hasBase = codeVal.length > 0 && nomVal.length > 0 && (f_usucla.value || '').trim().length >= 4;
      btnSave.disabled = !hasBase;
    } else {
      // In editing: compare with original selection
      const hasChanges = nomVal !== originalValues.usunom || 
                         mailVal !== originalValues.usumail || 
                         admVal !== originalValues.usuadm;
      btnSave.disabled = !hasChanges;
    }
  }

  // Setup Form Validators
  if (window.FormValidator) {
    FormValidator.setupAutoClear(usuarioForm);
  }



  // Listen to all inputs to update button status
  [f_usucod, f_usunom, f_usumail, f_usucla, f_usuadm].forEach(input => {
    if (input) {
      input.addEventListener('input', checkForChanges);
      input.addEventListener('change', checkForChanges);
    }
  });

  // Load and Render Users List
  async function fetchUsers() {
    try {
      let url = '/api/usuarios';
      const users = await AppFetch(url);
      cachedUsers = users;
      renderTable(users);
    } catch (err) {
      StatusBar.showMessage('Error al cargar usuarios: ' + err.message, 'error');
    }
  }

  function renderTable(users) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (users.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron registros.</td></tr>';
      return;
    }
    
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      if (selectedUserCode === user.usucod) {
        tr.classList.add('is-selected');
        tr.setAttribute('aria-selected', 'true');
      }
      
      const statusBadge = user.usustd 
        ? '<span class="badge badge--yes">Activo</span>' 
        : '<span class="badge badge--no">Inactivo</span>';

      tr.innerHTML = `
        <td class="uppercase"><strong>${user.usucod}</strong></td>
        <td>${user.usunom}</td>
        <td>${user.usuadm ? 'SÍ' : 'NO'}</td>
        <td>${statusBadge}</td>
      `;

      // Select row on click
      tr.addEventListener('click', () => {
        selectRow(user, tr);
      });

      tableBody.appendChild(tr);
    });
  }

  function selectRow(user, rowEl) {
    // Remove previous selection highlight
    tableBody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('is-selected');
      r.removeAttribute('aria-selected');
    });
    rowEl.classList.add('is-selected');
    rowEl.setAttribute('aria-selected', 'true');
    
    selectedUserCode = user.usucod;
    isEditing = true;
    
    // Clear validation highlights
    if (window.FormValidator) {
      FormValidator.clearValidation(usuarioForm);
    }
    
    // Populate form fields
    f_usucod.value = user.usucod;
    f_usucod.disabled = true;
    f_usunom.value = user.usunom;
    f_usumail.value = user.usumail || '';
    f_usuadm.checked = !!user.usuadm;
    
    // Hide creation password field, show update group
    passwordGroup.style.display = 'none';
    f_usucla.required = false;
    f_usucla.value = '';
    changePasswordGroup.style.display = 'block';
    f_newpass.value = '';
    
    // Adjust action button states
    btnAnular.disabled = false;
    btnAnular.style.display = 'inline-block';
    btnAnular.textContent = user.usustd ? 'ANULAR' : 'ACTIVAR';
    btnAnular.className = user.usustd ? 'btn btn-warning' : 'btn btn-soft';
    
    // Show Accesos button
    btnAcc.style.visibility = 'visible';
    btnAcc.textContent = 'Accesos';
    if (btnDelete) {
      btnDelete.style.display = 'inline-block';
      btnDelete.textContent = 'BORRAR';
    }

    // Store original values and check for changes (initially disabled)
    originalValues = {
      usucod: user.usucod,
      usunom: user.usunom || '',
      usumail: user.usumail || '',
      usuadm: !!user.usuadm
    };
    checkForChanges();
  }

  function resetForm() {
    selectedUserCode = null;
    isEditing = false;
    
    tableBody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('is-selected');
      r.removeAttribute('aria-selected');
    });
    
    usuarioForm.reset();
    f_usucod.disabled = false;
    
    // Show creation password field, hide update group
    passwordGroup.style.display = 'block';
    f_usucla.required = true;
    changePasswordGroup.style.display = 'none';
    f_newpass.value = '';
    
    btnAnular.disabled = true;
    btnAnular.style.display = 'none';
    btnAnular.textContent = 'ANULAR';
    btnAnular.className = 'btn btn-warning';
    btnAcc.style.visibility = 'hidden';
    if (btnDelete) btnDelete.style.display = 'none';
    
    if (window.FormValidator) {
      FormValidator.clearValidation(usuarioForm);
    }

    // Reset original values and check changes (initially disabled)
    originalValues = {
      usucod: '',
      usunom: '',
      usumail: '',
      usuadm: false
    };
    checkForChanges();
  }

  // Real-time Search Filter
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      if (!q) {
        renderTable(cachedUsers);
        return;
      }
      const filtered = cachedUsers.filter(u => 
        u.usucod.toLowerCase().includes(q) ||
        u.usunom.toLowerCase().includes(q) ||
        (u.usumail && u.usumail.toLowerCase().includes(q))
      );
      renderTable(filtered);
    });
  }

  // Action listeners
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      resetForm();
      f_usucod.focus();
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', resetForm);
  }

  if (btnSave) {
    btnSave.addEventListener('click', async (e) => {
      e.preventDefault();
      if (window.FormValidator && !FormValidator.validateForm(usuarioForm)) {
        StatusBar.showMessage('Por favor rellene los campos obligatorios', 'warning');
        return;
      }

      const usucod = f_usucod.value.trim();
      const payload = {
        usucod: usucod,
        usunom: f_usunom.value.trim(),
        usumail: f_usumail.value.trim(),
        usuadm: f_usuadm.checked
      };

      if (!isEditing) {
        payload.usucla = f_usucla.value.trim();
        if (payload.usucla.length < 4) {
          StatusBar.showMessage('La contraseña debe tener al menos 4 caracteres', 'warning');
          return;
        }
      }

      StatusBar.showMessage('Guardando usuario...', 'info');
      try {
        const url = isEditing ? `/api/usuarios/${usucod}` : '/api/usuarios';
        const method = isEditing ? 'PUT' : 'POST';
        const res = await AppFetch(url, {
          method: method,
          body: JSON.stringify(payload)
        });
        StatusBar.showMessage(res.message, 'success');
        
        // Refresh users list and keep selected state if edited
        const oldSelectedCode = selectedUserCode;
        await fetchUsers();
        if (isEditing && oldSelectedCode) {
          const updatedUser = cachedUsers.find(u => u.usucod === oldSelectedCode);
          if (updatedUser) {
            // Find row and select
            const trs = Array.from(tableBody.querySelectorAll('tr'));
            const rowIdx = cachedUsers.findIndex(u => u.usucod === oldSelectedCode);
            if (rowIdx !== -1 && trs[rowIdx]) {
              selectRow(updatedUser, trs[rowIdx]);
            }
          }
        } else {
          resetForm();
        }
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  if (btnAnular) {
    btnAnular.addEventListener('click', async () => {
      if (!selectedUserCode) return;
      
      const user = cachedUsers.find(u => u.usucod === selectedUserCode);
      if (!user) return;
      
      const targetStatus = !user.usustd;
      StatusBar.showMessage(`${targetStatus ? 'Activando' : 'Anulando'} usuario ${selectedUserCode}...`, 'info');
      try {
        const res = await AppFetch(`/api/usuarios/${selectedUserCode}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: targetStatus })
        });
        StatusBar.showMessage(res.message, 'success');
        await fetchUsers();
        
        // Update form state
        const updatedUser = cachedUsers.find(u => u.usucod === selectedUserCode);
        if (updatedUser) {
          btnAnular.textContent = updatedUser.usustd ? 'ANULAR' : 'ACTIVAR';
          btnAnular.className = updatedUser.usustd ? 'btn btn-warning' : 'btn btn-soft';
        }
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener('click', async () => {
      if (!selectedUserCode) return;
      StatusBar.showMessage(`Eliminando usuario ${selectedUserCode}...`, 'info');
      try {
        const res = await AppFetch(`/api/usuarios/${selectedUserCode}`, {
          method: 'DELETE'
        });
        StatusBar.showMessage(res.message, 'success');
        resetForm();
        await fetchUsers();
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  if (btnUpdatePass) {
    btnUpdatePass.addEventListener('click', async () => {
      if (!selectedUserCode) return;
      const pass = f_newpass.value.trim();
      if (!pass || pass.length < 4) {
        StatusBar.showMessage('La nueva contraseña debe tener al menos 4 caracteres', 'warning');
        return;
      }

      StatusBar.showMessage('Actualizando contraseña...', 'info');
      try {
        const res = await AppFetch(`/api/usuarios/${selectedUserCode}/password`, {
          method: 'PATCH',
          body: JSON.stringify({ new_password: pass })
        });
        StatusBar.showMessage(res.message, 'success');
        f_newpass.value = '';
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  let accModal = null;
  let accHandlersBound = false;

  function ensureAccModal() {
    let wrap = document.getElementById('acc-modal');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'acc-modal';
      wrap.hidden = true;
      wrap.style.cssText = 'position:fixed; inset:0; display:none; place-items:center; background:rgba(0,0,0,.4); z-index:100;';
      wrap.innerHTML = `
        <div class="card" style="max-width:920px; width:92%; max-height:90vh; overflow:auto;">
          <div class="card__head">
            <h3 class="card__title">Asignar accesos (empresa/taller)</h3>
            <button id="acc-close" class="btn btn-ghost">Cerrar</button>
          </div>
          <div class="card__body">
            <p class="hint">
              Selecciona los talleres y marca uno como <b>por defecto</b>.
              Para cada taller define el <b>tipo</b> (Ingresar/Consultar).
            </p>
            <div id="acc-container"></div>
            <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:10px;">
              <button id="acc-cancel" class="btn btn-soft">Cancelar</button>
              <button id="acc-save" class="btn btn--brand">Guardar accesos</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap);

      // CSS mini chips
      if (!document.getElementById('mini-chips-css')) {
        const css = document.createElement('style');
        css.id = 'mini-chips-css';
        css.textContent = `
          .mini-chips { display:flex; gap:6px }
          .mini-chips.is-disabled .chip-mini { opacity:.5; pointer-events:none }
          .chip-mini { padding:6px 10px; border:1px solid var(--border); border-radius:10px; background:#fff; cursor:pointer }
          .chip-mini.is-active {
            background: color-mix(in oklab, var(--brand-900) 10%, #fff);
            border-color: color-mix(in oklab, var(--brand-900) 25%, var(--border));
            font-weight:700
          }
        `;
        document.head.appendChild(css);
      }
    }
    accModal = wrap;

    if (!accHandlersBound) {
      accModal.addEventListener('click', (e) => { if (e.target.id === 'acc-modal') closeAcc(); });
      accModal.querySelector('#acc-close').onclick = closeAcc;
      accModal.querySelector('#acc-cancel').onclick = closeAcc;
      accHandlersBound = true;
    }
    return accModal;
  }

  function openAcc() {
    const m = ensureAccModal();
    m.style.display = 'grid';
  }

  function closeAcc() {
    if (!accModal) return;
    try {
      const box = accModal.querySelector('#acc-container');
      if (box) box.innerHTML = '';
      accModal.remove();
    } catch {}
    accModal = null;
    accHandlersBound = false;
  }

  async function renderAccesosPicker(usucod) {
    const root = ensureAccModal();
    const box = root.querySelector('#acc-container');

    box.innerHTML = `<div class="hint">Cargando...</div>`;
    try {
      const emps = await AppFetch('/api/catalogos/empresas');
      let actuales = [];
      if (usucod) {
        actuales = await AppFetch('/api/accesos?usucod=' + usucod);
      }

      const mapa = new Map(actuales.map(a => [`${a.empcod.trim()}|${a.talcod.trim()}`, a]));
      const bloques = [];

      for (const e of emps) {
        const talls = await AppFetch(`/api/catalogos/talleres/${e.empcod}`);
        if (!talls || !talls.length) {
          bloques.push(`
            <div class="card" style="margin:10px 0; padding:10px 12px">
              <b>${e.empnom}</b>
              <div class="hint">Sin talleres</div>
            </div>
          `);
          continue;
        }

        const filas = talls.map(t => {
          const k = `${e.empcod.trim()}|${t.talcod.trim()}`;
          const sel = mapa.get(k);
          const checked = sel?.accstd ? 'checked' : '';
          const def = (sel?.accflg === 1) ? 'checked' : '';
          const tip = sel?.usutip || 'I';
          const cleanEmp = e.empcod.trim().replace(/[^a-zA-Z0-9]/g, '-');
          const cleanTal = t.talcod.trim().replace(/[^a-zA-Z0-9]/g, '-');
          const chkId = `chk-${cleanEmp}-${cleanTal}`;
          const radId = `rad-${cleanEmp}-${cleanTal}`;
          return `
            <div class="acc-row" data-empcod="${e.empcod}" data-talcod="${t.talcod}">
              <label class="acc-col-name" for="${chkId}">
                <input type="checkbox" id="${chkId}" class="acc-chk switch" data-empcod="${e.empcod}" data-talcod="${t.talcod}" ${checked}>
                <div class="acc-name">
                  <b>${t.talnom}</b> <span class="acc-sub">(${e.empcod}-${t.talcod})</span>
                </div>
              </label>
              <div class="acc-col-type">
                <div class="seg ${checked ? '' : 'is-disabled'}" data-empcod="${e.empcod}" data-talcod="${t.talcod}">
                  <button type="button" class="seg-btn ${tip==='I'?'is-active':''}" data-val="I">Ingresar</button>
                  <button type="button" class="seg-btn ${tip==='C'?'is-active':''}" data-val="C">Consultar</button>
                </div>
              </div>
              <label class="acc-col-def" for="${radId}">
                <input type="radio" id="${radId}" name="accdef" class="acc-def" data-empcod="${e.empcod}" data-talcod="${t.talcod}" ${def} ${checked ? '' : 'disabled'}>
                <span class="hint">por defecto</span>
              </label>
            </div>
          `;
        }).join('');

        bloques.push(`
          <div class="card" style="margin:10px 0; padding:10px 12px">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
              <b>${e.empnom}</b>
              <button type="button" class="btn btn-soft btn-mini" data-empcod="${e.empcod}" data-act="selall">Marcar todos</button>
            </div>
            <div>${filas}</div>
          </div>
        `);
      }

      if (!bloques.length) {
        box.innerHTML = `<div class="hint">No hay empresas/talleres registradas</div>`;
      } else {
        box.innerHTML = bloques.join('');

        // Inject Styles
        (function injectAccCss() {
          if (document.getElementById('acc-modal-css')) return;
          const css = `
            #acc-modal .card {
              clip-path: none !important;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .acc-row{
              display:grid; grid-template-columns: 1fr auto auto;
              align-items:center; gap:16px;
              padding:14px 16px; border:1px solid var(--border, #e5e7eb);
              border-radius:14px; margin:12px 0; background:#fff;
            }
            .acc-col-name{ display:flex; align-items:center; gap:12px; min-width:0; cursor:pointer; user-select:none; }
            .acc-name b{ color: var(--brand-900, #0f2b66); }
            .acc-sub{ color: var(--muted, #667085); margin-left:6px; font-size:.92rem; }
            .seg{
              display:inline-flex; align-items:center;
              background: #f3f6fb; border:1px solid var(--border, #e5e7eb);
              border-radius:999px; overflow:hidden;
            }
            .seg.is-disabled{ opacity:.45; pointer-events:none; filter:grayscale(.1); }
            .seg-btn{
              min-width:100px;
              padding:9px 14px; border:0; background:transparent;
              font-weight:700; font-size:.95rem; color:#2b2f36; cursor:pointer;
            }
            .seg-btn + .seg-btn{ border-left:1px solid var(--border, #e5e7eb); }
            .seg-btn.is-active{
              background: color-mix(in oklab, var(--brand-900, #0f2b66) 16%, #fff);
              color: var(--brand-900, #0f2b66);
              box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--brand-900, #0f2b66) 25%, #b7c3e6);
            }
            .acc-col-def{ display:flex; align-items:center; gap:8px; white-space:nowrap; cursor:pointer; user-select:none; }
            .acc-col-def input[type="radio"]{ accent-color: var(--brand-700, #1d4ed8); cursor:pointer; }
            .switch{ width:44px; height:26px; flex-shrink:0; }
            @media (max-width: 768px){
              .acc-row{
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
                padding: 12px;
              }
              .acc-col-name {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
              }
              .acc-col-type {
                width: 100%;
              }
              .seg {
                display: flex;
                width: 100%;
              }
              .seg-btn {
                flex: 1;
                text-align: center;
                min-width: 0;
                padding: 8px 10px;
                font-size: .875rem;
              }
              .acc-col-def {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                justify-content: flex-start;
              }
            }
            @media (max-width: 480px){
              #acc-modal .card__body { padding: 8px; }
              .acc-row { padding: 10px; margin: 8px 0; }
            }
          `.trim();
          const tag = document.createElement('style');
          tag.id = 'acc-modal-css';
          tag.textContent = css;
          document.head.appendChild(tag);
        })();

        // Marcar todos
        box.querySelectorAll('[data-act=selall]').forEach(btn => {
          btn.addEventListener('click', () => {
            const emp = btn.dataset.empcod;
            const rows = box.querySelectorAll(`.acc-row[data-empcod="${emp}"]`);
            rows.forEach(row => {
              const chk = row.querySelector('.acc-chk');
              const seg = row.querySelector('.seg');
              const def = row.querySelector('.acc-def');
              chk.checked = true;
              seg.classList.remove('is-disabled');
              def.disabled = false;
              const active = seg.querySelector('.seg-btn.is-active');
              if (!active) seg.querySelector('.seg-btn[data-val="I"]').classList.add('is-active');
            });
          });
        });

        // Switch interaction
        box.addEventListener('change', (e) => {
          const chk = e.target.closest('.acc-chk');
          if (!chk) return;
          const seg = box.querySelector(`.seg[data-empcod="${chk.dataset.empcod}"][data-talcod="${chk.dataset.talcod}"]`);
          const rd = box.querySelector(`.acc-def[data-empcod="${chk.dataset.empcod}"][data-talcod="${chk.dataset.talcod}"]`);
          const on = chk.checked;
          seg?.classList.toggle('is-disabled', !on);
          if (rd) {
            rd.disabled = !on;
            if (!on && rd.checked) rd.checked = false;
          }
          if (on && seg && !seg.querySelector('.seg-btn.is-active')) {
            seg.querySelector('.seg-btn[data-val="I"]').classList.add('is-active');
          }
        });

        // Type Button Click
        box.addEventListener('click', (e) => {
          const btn = e.target.closest('.seg-btn');
          if (!btn) return;
          const seg = btn.closest('.seg');
          seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        });
      }

      // Save handler
      root.querySelector('#acc-save').onclick = async () => {
        let def = box.querySelector('.acc-def:checked');
        const rows = [...box.querySelectorAll('.acc-row')];
        const marcados = rows.filter(r => r.querySelector('.acc-chk')?.checked);

        if (!marcados.length) {
          StatusBar.showMessage('Selecciona al menos un taller', 'warning');
          return;
        }

        if (!def && marcados.length === 1) {
          const rd = marcados[0].querySelector('.acc-def');
          if (rd && !rd.disabled) {
            rd.checked = true;
            def = rd;
          }
        }

        if (!def) {
          StatusBar.showMessage('Marca un taller como por defecto', 'warning');
          return;
        }

        const items = marcados.map(r => {
          const empcod = r.dataset.empcod;
          const talcod = r.dataset.talcod;
          const activeTypeBtn = r.querySelector('.seg .seg-btn.is-active');
          const usutip = (activeTypeBtn?.dataset.val || 'I').toUpperCase();
          return {
            empcod,
            talcod,
            usutip,
            accstd: 1,
            accflg: (def.dataset.empcod === empcod && def.dataset.talcod === talcod) ? 1 : 0
          };
        });

        try {
          StatusBar.showMessage('Guardando accesos...', 'info');
          const res = await AppFetch(`/api/accesos/${usucod}/bulk`, {
            method: 'POST',
            body: JSON.stringify({ items })
          });
          StatusBar.showMessage(res.message, 'success');
          closeAcc();
        } catch (err) {
          StatusBar.showMessage(err.message, 'error');
        }
      };

    } catch (err) {
      box.innerHTML = `<div class="hint">Error cargando accesos</div>`;
      StatusBar.showMessage(err.message, 'error');
    }
  }

  async function openAccFor(usucod) {
    await renderAccesosPicker(usucod);
    openAcc();
  }

  if (btnAcc) {
    btnAcc.addEventListener('click', () => {
      if (selectedUserCode) {
        openAccFor(selectedUserCode);
      }
    });
  }

  // Initialize page
  fetchUsers();
  checkForChanges();
})();
