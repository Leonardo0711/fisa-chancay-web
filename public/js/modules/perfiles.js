// perfiles.js
(function() {
  const selectUser = document.getElementById('selectUser');
  const selectEmpresa = document.getElementById('selectEmpresa');
  const selectTaller = document.getElementById('selectTaller');
  const btnLoadPermissions = document.getElementById('btnLoadPermissions');
  
  const searchInput = document.getElementById('q');
  const tableBody = document.getElementById('matrix-tbody');
  
  const btnSavePermissions = document.getElementById('btnSavePermissions');
  const btnCancelMatrix = document.getElementById('btnCancelMatrix');

  let activeUser = '';
  let activeEmp = '';
  let activeTal = '';
  
  let cachedPrograms = [];
  let cachedPermissionsMap = {};

  function checkForMatrixChanges() {
    if (!btnSavePermissions) return;
    
    const rows = tableBody.querySelectorAll('tr[data-procod]');
    let hasChanges = false;

    for (const row of rows) {
      const procod = row.getAttribute('data-procod');
      const existing = cachedPermissionsMap[procod] || null;
      
      const flgcon = row.querySelector('.chk-perm[data-field="flgcon"]').checked;
      const flggra = row.querySelector('.chk-perm[data-field="flggra"]').checked;
      const flganu = row.querySelector('.chk-perm[data-field="flganu"]').checked;
      const flgeli = row.querySelector('.chk-perm[data-field="flgeli"]').checked;
      const flgimp = row.querySelector('.chk-perm[data-field="flgimp"]').checked;
      const flgope1 = row.querySelector('.chk-perm[data-field="flgope1"]').checked;
      const flgext1 = row.querySelector('.chk-perm[data-field="flgext1"]').checked;
      const flgope2 = row.querySelector('.chk-perm[data-field="flgope2"]').checked;
      const flgext2 = row.querySelector('.chk-perm[data-field="flgext2"]').checked;
      const flgope3 = row.querySelector('.chk-perm[data-field="flgope3"]').checked;
      const flgext3 = row.querySelector('.chk-perm[data-field="flgext3"]').checked;
      const flgope4 = row.querySelector('.chk-perm[data-field="flgope4"]').checked;
      const flgext4 = row.querySelector('.chk-perm[data-field="flgext4"]').checked;

      const fields = [
        'flgcon', 'flggra', 'flganu', 'flgeli', 'flgimp',
        'flgope1', 'flgext1', 'flgope2', 'flgext2', 'flgope3', 'flgext3', 'flgope4', 'flgext4'
      ];
      
      const currentVals = {
        flgcon, flggra, flganu, flgeli, flgimp,
        flgope1, flgext1, flgope2, flgext2, flgope3, flgext3, flgope4, flgext4
      };

      for (const field of fields) {
        const dbVal = existing ? !!existing[field] : false;
        const domVal = !!currentVals[field];
        if (dbVal !== domVal) {
          hasChanges = true;
          break;
        }
      }
      if (hasChanges) break;
    }

    btnSavePermissions.disabled = !hasChanges;
  }

  // Setup url parameters pre-selection if any
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserParam = urlParams.get('usuario');

  // Load Catalogs on Startup
  async function loadUsersForWorkshop() {
    const empcod = selectEmpresa.value;
    const talcod = selectTaller.value;
    
    selectUser.innerHTML = '<option value="">Cargando usuarios...</option>';
    
    if (!empcod || !talcod) {
      selectUser.innerHTML = '<option value="">Seleccione taller primero...</option>';
      return;
    }

    try {
      const users = await AppFetch(`/api/usuarios?usustd=1&empcod=${empcod}&talcod=${talcod}`);
      selectUser.innerHTML = '<option value="">Seleccione usuario...</option>';
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.usucod;
        opt.textContent = `[${u.usucod}] ${u.usunom}`;
        selectUser.appendChild(opt);
      });
      
      if (targetUserParam) {
        selectUser.value = targetUserParam.toUpperCase();
      }
    } catch (err) {
      console.error('Error loading users:', err.message);
      selectUser.innerHTML = '<option value="">Error al cargar usuarios</option>';
    }
  }

  // Load Catalogs on Startup
  async function loadCatalogs() {
    try {
      // 1. Load active companies
      const companies = await AppFetch('/api/catalogos/empresas');
      selectEmpresa.innerHTML = '<option value="">Seleccione empresa...</option>';
      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.empcod;
        opt.textContent = `[${c.empcod}] ${c.empnom}`;
        selectEmpresa.appendChild(opt);
      });

      // Auto-select first company (FISA) and load its workshops
      if (companies.length > 0) {
        selectEmpresa.value = companies[0].empcod;
        // Trigger workshop loading
        const workshops = await AppFetch(`/api/catalogos/talleres/${companies[0].empcod}`);
        selectTaller.innerHTML = '<option value="">Seleccione taller...</option>';
        if (workshops.length > 0) {
          workshops.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.talcod;
            opt.textContent = `[${w.talcod}] ${w.talnom}`;
            selectTaller.appendChild(opt);
          });
          selectTaller.disabled = false;
          // Auto-select first workshop (Chancay)
          selectTaller.value = workshops[0].talcod;
        }
      }

      // Load users for the auto-selected workshop
      await loadUsersForWorkshop();

    } catch (err) {
      console.error('Error loading catalogs:', err.message);
    }
  }

  // Handle company change in selector
  selectEmpresa.addEventListener('change', async () => {
    const empcod = selectEmpresa.value;
    selectTaller.innerHTML = '<option value="">Seleccione taller...</option>';
    
    if (!empcod) {
      selectTaller.disabled = true;
      selectUser.innerHTML = '<option value="">Seleccione taller primero...</option>';
      return;
    }

    try {
      const workshops = await AppFetch(`/api/catalogos/talleres/${empcod}`);
      if (workshops.length === 0) {
        selectTaller.innerHTML = '<option value="">No hay talleres disponibles</option>';
        selectTaller.disabled = true;
        selectUser.innerHTML = '<option value="">Seleccione taller primero...</option>';
        return;
      }

      workshops.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.talcod;
        opt.textContent = `[${w.talcod}] ${w.talnom}`;
        selectTaller.appendChild(opt);
      });
      selectTaller.disabled = false;
      selectTaller.value = workshops[0].talcod;
      await loadUsersForWorkshop();
    } catch (err) {
      StatusBar.showMessage('Error al cargar talleres: ' + err.message, 'error');
    }
  });

  // Handle workshop change in selector
  selectTaller.addEventListener('change', async () => {
    await loadUsersForWorkshop();
  });

  // Load Matrix
  async function loadPermissionsMatrix() {
    const usucod = selectUser.value;
    const empcod = selectEmpresa.value;
    const talcod = selectTaller.value;

    if (!usucod || !empcod || !talcod) {
      StatusBar.showMessage('Por favor seleccione Usuario y Taller', 'warning');
      return;
    }

    activeUser = usucod;
    activeEmp = empcod;
    activeTal = talcod;

    StatusBar.showMessage('Cargando matriz de permisos...', 'info');
    try {
      // 1. Fetch active programs
      const programs = await AppFetch('/api/programas?prostd=1');
      cachedPrograms = programs;
      
      // 2. Fetch existing permissions array for this user/workshop context
      const existingPerms = await AppFetch(`/api/perfiles?usucod=${usucod}&empcod=${empcod}&talcod=${talcod}`);
      
      // Index by program code
      cachedPermissionsMap = {};
      existingPerms.forEach(p => {
        cachedPermissionsMap[p.procod] = p;
      });

      renderMatrix(programs, cachedPermissionsMap);
      checkForMatrixChanges();
      
      // Show action buttons
      if (btnSavePermissions) btnSavePermissions.style.display = 'inline-block';
      if (btnCancelMatrix) btnCancelMatrix.style.display = 'inline-block';
      
      StatusBar.showMessage('Matriz de permisos cargada', 'success');
    } catch (err) {
      StatusBar.showMessage('Error al cargar matriz: ' + err.message, 'error');
    }
  }

  btnLoadPermissions.addEventListener('click', loadPermissionsMatrix);

  function renderMatrix(programs, permMap) {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (programs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="15" class="text-center">No hay programas activos.</td></tr>';
      return;
    }

    programs.forEach(prog => {
      const existing = permMap[prog.procod] || null;
      
      const tr = document.createElement('tr');
      tr.setAttribute('data-procod', prog.procod);
      
      const chk = (field, checked) => `
        <label class="chk-container">
          <input type="checkbox" class="chk-perm" data-field="${field}" ${checked ? 'checked' : ''}>
          <span class="chk-custom"></span>
        </label>
      `;

      // If there is an existing database record, show a text button to trigger the DELETE endpoint.
      const hasRecord = !!existing;
      const deleteBtn = hasRecord
        ? `<button class="btn btn-danger btn-delete-perm" data-procod="${prog.procod}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px;" title="Eliminar permiso del perfil">Eliminar</button>`
        : `<span style="color:var(--muted); font-size:0.85rem;">—</span>`;

      tr.innerHTML = `
        <td>
          <strong>${prog.procod}</strong><br>
          <span style="font-size:0.85rem; color:var(--muted);">${prog.pronom}</span>
        </td>
        <td class="text-center">${chk('flgcon', existing ? existing.flgcon : false)}</td>
        <td class="text-center">${chk('flggra', existing ? existing.flggra : false)}</td>
        <td class="text-center">${chk('flganu', existing ? existing.flganu : false)}</td>
        <td class="text-center">${chk('flgeli', existing ? existing.flgeli : false)}</td>
        <td class="text-center">${chk('flgimp', existing ? existing.flgimp : false)}</td>
        <td class="text-center">${chk('flgope1', existing ? existing.flgope1 : false)}</td>
        <td class="text-center">${chk('flgext1', existing ? existing.flgext1 : false)}</td>
        <td class="text-center">${chk('flgope2', existing ? existing.flgope2 : false)}</td>
        <td class="text-center">${chk('flgext2', existing ? existing.flgext2 : false)}</td>
        <td class="text-center">${chk('flgope3', existing ? existing.flgope3 : false)}</td>
        <td class="text-center">${chk('flgext3', existing ? existing.flgext3 : false)}</td>
        <td class="text-center">${chk('flgope4', existing ? existing.flgope4 : false)}</td>
        <td class="text-center">${chk('flgext4', existing ? existing.flgext4 : false)}</td>
        <td class="text-center">${deleteBtn}</td>
      `;

      tableBody.appendChild(tr);
    });

    attachMatrixActionListeners();

    // Listen to checkbox changes to update Save button state
    tableBody.querySelectorAll('.chk-perm').forEach(chk => {
      chk.addEventListener('change', checkForMatrixChanges);
    });
  }

  function attachMatrixActionListeners() {
    // Delete permission button handler
    tableBody.querySelectorAll('.btn-delete-perm').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const procod = btn.getAttribute('data-procod');
        if (!activeEmp || !activeTal || !activeUser || !procod) return;

        StatusBar.showMessage(`Eliminando permiso para módulo ${procod}...`, 'info');
        try {
          const res = await AppFetch(`/api/perfiles/${activeEmp}/${activeTal}/${activeUser}/${procod}`, {
            method: 'DELETE'
          });
          StatusBar.showMessage(res.message, 'success');
          // Reload matrix
          loadPermissionsMatrix();
        } catch (err) {
          StatusBar.showMessage(err.message, 'error');
        }
      });
    });
  }

  // Real-time Search filter
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      const rows = tableBody.querySelectorAll('tr[data-procod]');
      rows.forEach(row => {
        const procod = row.getAttribute('data-procod').toLowerCase();
        const sub = row.querySelector('span') ? row.querySelector('span').textContent.toLowerCase() : '';
        if (!q || procod.includes(q) || sub.includes(q)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Cancel / Reset Matrix UI
  if (btnCancelMatrix) {
    btnCancelMatrix.addEventListener('click', () => {
      activeUser = '';
      activeEmp = '';
      activeTal = '';
      cachedPrograms = [];
      cachedPermissionsMap = {};
      
      tableBody.innerHTML = `
        <tr class="row-empty">
          <td colspan="15" class="text-center">Seleccione Usuario y Taller para cargar la matriz de privilegios.</td>
        </tr>
      `;
      
      if (btnSavePermissions) btnSavePermissions.style.display = 'none';
      btnCancelMatrix.style.display = 'none';
      if (searchInput) searchInput.value = '';
    });
  }

  // Save permissions matrix
  if (btnSavePermissions) {
    btnSavePermissions.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!activeUser || !activeEmp || !activeTal) return;

      // Aggregate checked rows
      const rows = tableBody.querySelectorAll('tr[data-procod]');
      const permissions = [];

      rows.forEach(row => {
        const procod = row.getAttribute('data-procod');
        const flgcon = row.querySelector('.chk-perm[data-field="flgcon"]').checked;
        const flggra = row.querySelector('.chk-perm[data-field="flggra"]').checked;
        const flganu = row.querySelector('.chk-perm[data-field="flganu"]').checked;
        const flgeli = row.querySelector('.chk-perm[data-field="flgeli"]').checked;
        const flgimp = row.querySelector('.chk-perm[data-field="flgimp"]').checked;
        const flgope1 = row.querySelector('.chk-perm[data-field="flgope1"]').checked;
        const flgext1 = row.querySelector('.chk-perm[data-field="flgext1"]').checked;
        const flgope2 = row.querySelector('.chk-perm[data-field="flgope2"]').checked;
        const flgext2 = row.querySelector('.chk-perm[data-field="flgext2"]').checked;
        const flgope3 = row.querySelector('.chk-perm[data-field="flgope3"]').checked;
        const flgext3 = row.querySelector('.chk-perm[data-field="flgext3"]').checked;
        const flgope4 = row.querySelector('.chk-perm[data-field="flgope4"]').checked;
        const flgext4 = row.querySelector('.chk-perm[data-field="flgext4"]').checked;

        // Only save if at least one checkbox is checked to save database rows
        if (flgcon || flggra || flganu || flgeli || flgimp || 
            flgope1 || flgext1 || flgope2 || flgext2 || flgope3 || flgext3 || flgope4 || flgext4) {
          permissions.push({ 
            procod, flgcon, flggra, flganu, flgeli, flgimp,
            flgope1, flgext1, flgope2, flgext2, flgope3, flgext3, flgope4, flgext4
          });
        }
      });

      const payload = {
        usucod: activeUser,
        empcod: activeEmp,
        talcod: activeTal,
        permissions: permissions
      };

      StatusBar.showMessage('Guardando matriz de permisos...', 'info');
      try {
        const res = await AppFetch('/api/perfiles/guardar', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        StatusBar.showMessage(res.message, 'success');
        loadPermissionsMatrix();
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  // Initialize
  loadCatalogs();
})();
