// accesos.js
(function() {
  const tableBody = document.getElementById('acc-tbody');
  const searchInput = document.getElementById('q');
  
  // Form fields
  const accesoForm = document.getElementById('accesoForm');
  const f_usucod = document.getElementById('f-usucod');
  const f_empcod = document.getElementById('f-empcod');
  const f_talcod = document.getElementById('f-talcod');
  const f_usutip = document.getElementById('f-usutip');
  
  // Side Action Buttons
  const btnNew = document.getElementById('btn-new');
  const btnSave = document.getElementById('btn-save');
  const btnAnular = document.getElementById('btn-anular');
  const btnDefault = document.getElementById('btn-default');
  const btnCancel = document.getElementById('btn-cancel');

  let isEditing = false;
  let cachedAccesses = [];
  let selectedAccess = null; // { empcod, talcod, usucod }

  // Check if we have an incoming user filter in the URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserParam = urlParams.get('usuario');

  // Track original values to detect changes
  let originalValues = {
    usucod: '',
    empcod: '',
    talcod: '',
    usutip: 'I'
  };

  function checkForChanges() {
    if (!btnSave) return;
    const usuVal = (f_usucod.value || '').trim().toUpperCase();
    const empVal = (f_empcod.value || '').trim().toUpperCase();
    const talVal = (f_talcod.value || '').trim().toUpperCase();
    const tipVal = (f_usutip.value || '').trim().toUpperCase();

    if (!isEditing) {
      // In creation: enable if user code, company, and workshop are populated
      const hasBase = usuVal.length > 0 && empVal.length > 0 && talVal.length > 0;
      btnSave.disabled = !hasBase;
    } else {
      // In editing: primary keys (usucod, empcod, talcod) are disabled. Only usutip is editable.
      const hasChanges = tipVal !== originalValues.usutip;
      btnSave.disabled = !hasChanges;
    }
  }

  // Setup Form Validators
  if (window.FormValidator) {
    FormValidator.setupAutoClear(accesoForm);
  }

  // Listen to all inputs to update button status
  [f_usucod, f_empcod, f_talcod, f_usutip].forEach(input => {
    if (input) {
      input.addEventListener('input', checkForChanges);
      input.addEventListener('change', checkForChanges);
    }
  });

  // Capitalize usucod while typing
  if (f_usucod) {
    f_usucod.addEventListener('input', () => {
      f_usucod.value = f_usucod.value.toUpperCase();
    });
  }

  // Load Catalogs on Startup
  async function loadCatalogs() {
    try {
      // 1. Load active companies
      const companies = await AppFetch('/api/catalogos/empresas');
      f_empcod.innerHTML = '<option value="">Seleccione empresa...</option>';
      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.empcod;
        opt.textContent = `[${c.empcod}] ${c.empnom}`;
        f_empcod.appendChild(opt);
      });

      // Auto-select first company (FISA) and load its workshops
      if (companies.length > 0) {
        f_empcod.value = companies[0].empcod;
        await loadWorkshops(companies[0].empcod);
        // Auto-select first workshop (Chancay)
        if (f_talcod.options.length > 1) {
          f_talcod.value = f_talcod.options[1].value;
        }
      }

      // 2. Load active users
      const users = await AppFetch('/api/usuarios?usustd=1');
      f_usucod.innerHTML = '<option value="">Seleccione un usuario...</option>';
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.usucod;
        opt.textContent = `[${u.usucod}] ${u.usunom}`;
        f_usucod.appendChild(opt);
      });

      // Pre-select user if passed in URL
      if (targetUserParam) {
        f_usucod.value = targetUserParam.toUpperCase();
        if (searchInput) {
          searchInput.value = targetUserParam;
        }
      }

    } catch (err) {
      console.error('Error loading catalogs:', err.message);
    }
  }

  // Handle company selection change in form to load workshops
  f_empcod.addEventListener('change', async () => {
    await loadWorkshops(f_empcod.value);
  });

  async function loadWorkshops(empcod, selectedTalcod = null) {
    f_talcod.innerHTML = '<option value="">Seleccione taller...</option>';
    
    if (!empcod) {
      f_talcod.disabled = true;
      return;
    }

    try {
      const workshops = await AppFetch(`/api/catalogos/talleres/${empcod}`);
      if (workshops.length === 0) {
        f_talcod.innerHTML = '<option value="">No hay talleres disponibles</option>';
        f_talcod.disabled = true;
        return;
      }

      workshops.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.talcod;
        opt.textContent = `[${w.talcod}] ${w.talnom}`;
        f_talcod.appendChild(opt);
      });
      
      f_talcod.disabled = false;
      if (selectedTalcod) {
        f_talcod.value = selectedTalcod;
      }
    } catch (err) {
      StatusBar.showMessage('Error al cargar talleres: ' + err.message, 'error');
    }
  }

  // Load and Render Accesses List
  async function fetchAccesses() {
    try {
      const list = await AppFetch('/api/accesos');
      // Set accflg to number to ensure proper comparison
      cachedAccesses = list.map(item => ({
        ...item,
        accflg: Number(item.accflg)
      }));
      renderTable(cachedAccesses);
      
      // Auto-filter table if URL param is set
      if (targetUserParam) {
        const filtered = cachedAccesses.filter(a => a.usucod.toLowerCase().includes(targetUserParam.toLowerCase()));
        renderTable(filtered);
      }
    } catch (err) {
      StatusBar.showMessage('Error al cargar accesos: ' + err.message, 'error');
    }
  }

  function renderTable(list) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron registros.</td></tr>';
      return;
    }

    list.forEach(acc => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      
      if (selectedAccess && 
          selectedAccess.empcod === acc.empcod && 
          selectedAccess.talcod === acc.talcod && 
          selectedAccess.usucod === acc.usucod) {
        tr.classList.add('is-selected');
        tr.setAttribute('aria-selected', 'true');
      }

      const defaultBadge = acc.accflg === 1 
        ? '<span class="badge badge--ok">PREDETERMINADO</span>' 
        : '<span style="color:var(--muted); font-size:0.85rem;">—</span>';

      const statusBadge = acc.accstd
        ? '<span class="badge badge--yes">Activo</span>'
        : '<span class="badge badge--no">Inactivo</span>';

      const typeBadge = acc.usutip === 'I'
        ? '<span class="badge badge--off">Ingresar</span>'
        : '<span class="badge badge--muted">Consultar</span>';

      tr.innerHTML = `
        <td class="uppercase"><strong>${acc.usucod}</strong></td>
        <td>${acc.usunom || '-'}</td>
        <td class="uppercase">${acc.empcod}</td>
        <td class="uppercase">${acc.talcod} - ${acc.talnom || ''}</td>
        <td>${typeBadge}</td>
        <td>${defaultBadge}</td>
        <td>${statusBadge}</td>
      `;

      tr.addEventListener('click', () => {
        selectRow(acc, tr);
      });

      tableBody.appendChild(tr);
    });
  }

  function selectRow(acc, rowEl) {
    tableBody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('is-selected');
      r.removeAttribute('aria-selected');
    });
    rowEl.classList.add('is-selected');
    rowEl.setAttribute('aria-selected', 'true');
    
    selectedAccess = acc;
    isEditing = true;
    
    if (window.FormValidator) {
      FormValidator.clearValidation(accesoForm);
    }
    
    // Set form fields
    f_usucod.value = acc.usucod;
    f_usucod.disabled = true;
    f_empcod.value = acc.empcod;
    f_empcod.disabled = true;
    f_usutip.value = acc.usutip || 'I';
    
    // Load workshops and select target
    loadWorkshops(acc.empcod, acc.talcod).then(() => {
      f_talcod.disabled = true;
    });
    
    btnAnular.disabled = false;
    btnAnular.textContent = acc.accstd ? 'Desactivar' : 'Activar';
    btnAnular.className = acc.accstd ? 'btn btn-danger' : 'btn btn-soft';
    
    // Show predeterminado button if active and not already default
    if (acc.accstd && acc.accflg !== 1) {
      btnDefault.style.visibility = 'visible';
    } else {
      btnDefault.style.visibility = 'hidden';
    }

    // Store original values and check for changes (initially disabled)
    originalValues = {
      usucod: acc.usucod,
      empcod: acc.empcod,
      talcod: acc.talcod,
      usutip: acc.usutip || 'I'
    };
    checkForChanges();
  }

  function resetForm() {
    selectedAccess = null;
    isEditing = false;
    
    tableBody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('is-selected');
      r.removeAttribute('aria-selected');
    });
    
    accesoForm.reset();
    f_usucod.disabled = false;
    f_empcod.disabled = false;
    f_usutip.value = 'I';
    
    // Re-select default FISA company and Chancay workshop robustly
    const fisaOption = Array.from(f_empcod.options).find(opt => opt.value === 'FISA');
    if (fisaOption) {
      f_empcod.value = 'FISA';
    } else if (f_empcod.options.length > 1) {
      f_empcod.value = f_empcod.options[1].value;
    }
    
    if (f_empcod.value) {
      loadWorkshops(f_empcod.value).then(() => {
        const chancayOption = Array.from(f_talcod.options).find(opt => opt.value === 'CHANCAY');
        if (chancayOption) {
          f_talcod.value = 'CHANCAY';
        } else if (f_talcod.options.length > 1) {
          f_talcod.value = f_talcod.options[1].value;
        }
        checkForChanges();
      });
    } else {
      f_talcod.innerHTML = '<option value="">Seleccione taller...</option>';
      f_talcod.disabled = true;
      checkForChanges();
    }
    
    btnAnular.disabled = true;
    btnAnular.textContent = 'Desactivar';
    btnAnular.className = 'btn btn-danger';
    
    btnDefault.style.visibility = 'hidden';
    
    if (window.FormValidator) {
      FormValidator.clearValidation(accesoForm);
    }

    // Reset original values
    originalValues = {
      usucod: '',
      empcod: '',
      talcod: '',
      usutip: 'I'
    };
  }

  // Real-time Search Filter
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      if (!q) {
        renderTable(cachedAccesses);
        return;
      }
      const filtered = cachedAccesses.filter(acc => 
        acc.usucod.toLowerCase().includes(q) ||
        (acc.usunom && acc.usunom.toLowerCase().includes(q)) ||
        acc.empcod.toLowerCase().includes(q) ||
        acc.talcod.toLowerCase().includes(q) ||
        (acc.talnom && acc.talnom.toLowerCase().includes(q))
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
      if (window.FormValidator && !FormValidator.validateForm(accesoForm)) {
        StatusBar.showMessage('Por favor rellene los campos obligatorios', 'warning');
        return;
      }

      const payload = {
        usucod: f_usucod.value,
        empcod: f_empcod.value,
        talcod: f_talcod.value,
        usutip: f_usutip.value,
        accstd: selectedAccess ? selectedAccess.accstd : true,
        accflg: selectedAccess ? selectedAccess.accflg : 0
      };

      if (isEditing) {
        StatusBar.showMessage('Actualizando acceso...', 'info');
        try {
          const res = await AppFetch(`/api/accesos/${payload.empcod}/${payload.talcod}/${payload.usucod}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          StatusBar.showMessage(res.message, 'success');
          resetForm();
          fetchAccesses();
        } catch (err) {
          StatusBar.showMessage(err.message, 'error');
        }
        return;
      }

      StatusBar.showMessage('Asignando acceso...', 'info');
      try {
        const res = await AppFetch('/api/accesos', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        StatusBar.showMessage(res.message, 'success');
        resetForm();
        fetchAccesses();
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  if (btnAnular) {
    btnAnular.addEventListener('click', async () => {
      if (!selectedAccess) return;
      const { empcod, talcod, usucod } = selectedAccess;
      
      const acc = cachedAccesses.find(a => a.empcod === empcod && a.talcod === talcod && a.usucod === usucod);
      if (!acc) return;
      
      const targetStatus = !acc.accstd;
      StatusBar.showMessage(`${targetStatus ? 'Activando' : 'Desactivando'} acceso...`, 'info');
      try {
        const res = await AppFetch(`/api/accesos/${empcod}/${talcod}/${usucod}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: targetStatus })
        });
        StatusBar.showMessage(res.message, 'success');
        await fetchAccesses();
        
        const updated = cachedAccesses.find(a => a.empcod === empcod && a.talcod === talcod && a.usucod === usucod);
        if (updated) {
          btnAnular.textContent = updated.accstd ? 'Desactivar' : 'Activar';
          btnAnular.className = updated.accstd ? 'btn btn-danger' : 'btn btn-soft';
          
          if (updated.accstd && updated.accflg !== 1) {
            btnDefault.style.visibility = 'visible';
          } else {
            btnDefault.style.visibility = 'hidden';
          }
        }
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  if (btnDefault) {
    btnDefault.addEventListener('click', async () => {
      if (!selectedAccess) return;
      const { empcod, talcod, usucod } = selectedAccess;
      
      StatusBar.showMessage('Estableciendo acceso predeterminado...', 'info');
      try {
        const res = await AppFetch(`/api/accesos/${empcod}/${talcod}/${usucod}/default`, {
          method: 'PATCH'
        });
        StatusBar.showMessage(res.message, 'success');
        await fetchAccesses();
        
        // Find updated and select again to update default button visibility
        const updated = cachedAccesses.find(a => a.empcod === empcod && a.talcod === talcod && a.usucod === usucod);
        if (updated) {
          btnDefault.style.visibility = 'hidden';
        }
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  // Initialize page
  loadCatalogs().then(() => {
    fetchAccesses();
    checkForChanges();
  });
})();
