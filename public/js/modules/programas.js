// programas.js
(function() {
  const tableBody = document.getElementById('prg-tbody');
  const searchInput = document.getElementById('q');
  
  // Form fields
  const programaForm = document.getElementById('programaForm');
  const f_procod = document.getElementById('f-procod');
  const f_pronom = document.getElementById('f-pronom');
  const f_prodes = document.getElementById('f-prodes');
  
  // Side Action Buttons
  const btnNew = document.getElementById('btn-new');
  const btnSave = document.getElementById('btn-save');
  const btnAnular = document.getElementById('btn-anular');
  const btnCancel = document.getElementById('btn-cancel');
  const btnDelete = document.getElementById('btn-delete');

  let isEditing = false;
  let cachedPrograms = [];
  let selectedProgramCode = null;

  // Track original values to detect changes
  let originalValues = {
    procod: '',
    pronom: '',
    prodes: ''
  };

  function checkForChanges() {
    if (!btnSave) return;
    const codeVal = (f_procod.value || '').trim().toUpperCase();
    const nomVal = (f_pronom.value || '').trim();
    const desVal = (f_prodes.value || '').trim();

    if (!isEditing) {
      // In creation: enable if base fields are populated
      const hasBase = codeVal.length > 0 && nomVal.length > 0;
      btnSave.disabled = !hasBase;
    } else {
      // In editing: compare with original selection
      const hasChanges = nomVal !== originalValues.pronom || desVal !== originalValues.prodes;
      btnSave.disabled = !hasChanges;
    }
  }

  // Setup Form Validators
  if (window.FormValidator) {
    FormValidator.setupAutoClear(programaForm);
  }

  // Listen to all inputs to update button status
  [f_procod, f_pronom, f_prodes].forEach(input => {
    if (input) {
      input.addEventListener('input', checkForChanges);
      input.addEventListener('change', checkForChanges);
    }
  });

  async function fetchPrograms() {
    try {
      const programs = await AppFetch('/api/programas');
      cachedPrograms = programs;
      renderTable(programs);
      if (!selectedProgramCode) {
        await resetForm();
      }
    } catch (err) {
      StatusBar.showMessage('Error al cargar programas: ' + err.message, 'error');
    }
  }

  function renderTable(programs) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (programs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron registros.</td></tr>';
      return;
    }
    
    programs.forEach(prog => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      if (selectedProgramCode === prog.procod) {
        tr.classList.add('is-selected');
        tr.setAttribute('aria-selected', 'true');
      }
      
      const statusBadge = prog.prostd 
        ? '<span class="badge badge--yes">Activo</span>' 
        : '<span class="badge badge--no">Inactivo</span>';

      tr.innerHTML = `
        <td class="uppercase"><strong>${prog.procod}</strong></td>
        <td>${prog.pronom}</td>
        <td>${prog.prodes || ''}</td>
        <td>${statusBadge}</td>
      `;

      tr.addEventListener('click', () => {
        selectRow(prog, tr);
      });

      tableBody.appendChild(tr);
    });
  }

  function selectRow(prog, rowEl) {
    tableBody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('is-selected');
      r.removeAttribute('aria-selected');
    });
    rowEl.classList.add('is-selected');
    rowEl.setAttribute('aria-selected', 'true');
    
    selectedProgramCode = prog.procod;
    isEditing = true;
    
    if (window.FormValidator) {
      FormValidator.clearValidation(programaForm);
    }
    
    f_procod.value = prog.procod;
    f_procod.readOnly = true;
    f_pronom.value = prog.pronom;
    f_prodes.value = prog.prodes || '';
    
    btnAnular.disabled = false;
    btnAnular.style.display = 'inline-block';
    btnAnular.textContent = prog.prostd ? 'ANULAR' : 'ACTIVAR';
    btnAnular.className = prog.prostd ? 'btn btn-warning' : 'btn btn-soft';
    if (btnDelete) btnDelete.style.display = 'inline-block';

    // Store original values and check for changes (initially disabled)
    originalValues = {
      procod: prog.procod,
      pronom: prog.pronom || '',
      prodes: prog.prodes || ''
    };
    checkForChanges();
  }

  async function resetForm() {
    selectedProgramCode = null;
    isEditing = false;
    
    tableBody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('is-selected');
      r.removeAttribute('aria-selected');
    });
    
    programaForm.reset();
    f_procod.readOnly = true;
    f_procod.placeholder = 'Cargando...';
    f_procod.value = '';
    
    btnAnular.disabled = true;
    btnAnular.style.display = 'none';
    if (btnDelete) btnDelete.style.display = 'none';
    
    if (window.FormValidator) {
      FormValidator.clearValidation(programaForm);
    }

    originalValues = {
      procod: '',
      pronom: '',
      prodes: ''
    };
    checkForChanges();

    try {
      const res = await AppFetch('/api/programas/next-code');
      f_procod.value = res.nextCode;
      originalValues.procod = res.nextCode;
      checkForChanges();
    } catch (err) {
      console.error('Error fetching next code:', err);
      f_procod.placeholder = 'Error al cargar';
    }
  }

  // Real-time Search Filter
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      if (!q) {
        renderTable(cachedPrograms);
        return;
      }
      const filtered = cachedPrograms.filter(p => 
        p.procod.toLowerCase().includes(q) ||
        p.pronom.toLowerCase().includes(q) ||
        (p.prodes || '').toLowerCase().includes(q)
      );
      renderTable(filtered);
    });
  }

  // Action listeners
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      resetForm();
      f_pronom.focus();
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', resetForm);
  }

  if (btnSave) {
    btnSave.addEventListener('click', async (e) => {
      e.preventDefault();
      if (window.FormValidator && !FormValidator.validateForm(programaForm)) {
        StatusBar.showMessage('Por favor rellene los campos obligatorios', 'warning');
        return;
      }

      const procod = f_procod.value.trim().toUpperCase();
      const payload = {
        procod: procod,
        pronom: f_pronom.value.trim(),
        prodes: f_prodes.value.trim()
      };

      StatusBar.showMessage('Guardando programa...', 'info');
      try {
        const url = isEditing ? `/api/programas/${procod}` : '/api/programas';
        const method = isEditing ? 'PUT' : 'POST';
        const res = await AppFetch(url, {
          method: method,
          body: JSON.stringify(payload)
        });
        StatusBar.showMessage(res.message, 'success');
        
        const oldSelectedCode = selectedProgramCode;
        await fetchPrograms();
        if (isEditing && oldSelectedCode) {
          const updated = cachedPrograms.find(p => p.procod === oldSelectedCode);
          if (updated) {
            const trs = Array.from(tableBody.querySelectorAll('tr'));
            const idx = cachedPrograms.findIndex(p => p.procod === oldSelectedCode);
            if (idx !== -1 && trs[idx]) {
              selectRow(updated, trs[idx]);
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
      if (!selectedProgramCode) return;
      
      const prog = cachedPrograms.find(p => p.procod === selectedProgramCode);
      if (!prog) return;
      
      const targetStatus = !prog.prostd;
      StatusBar.showMessage(`${targetStatus ? 'Activando' : 'Anulando'} programa ${selectedProgramCode}...`, 'info');
      try {
        const res = await AppFetch(`/api/programas/${selectedProgramCode}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: targetStatus })
        });
        StatusBar.showMessage(res.message, 'success');
        await fetchPrograms();
        
        const updated = cachedPrograms.find(p => p.procod === selectedProgramCode);
        if (updated) {
          btnAnular.textContent = updated.prostd ? 'ANULAR' : 'ACTIVAR';
          btnAnular.className = updated.prostd ? 'btn btn-warning' : 'btn btn-soft';
        }
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener('click', async () => {
      if (!selectedProgramCode) return;
      StatusBar.showMessage(`Eliminando programa ${selectedProgramCode}...`, 'info');
      try {
        const res = await AppFetch(`/api/programas/${selectedProgramCode}`, {
          method: 'DELETE'
        });
        StatusBar.showMessage(res.message, 'success');
        resetForm();
        await fetchPrograms();
      } catch (err) {
        StatusBar.showMessage(err.message, 'error');
      }
    });
  }

  // Initialize page
  fetchPrograms();
  checkForChanges();
})();
