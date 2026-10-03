// public/js/modules/maestros_unidades.js
(function() {
  'use strict';

  let currentUnicod = null; // null means "creating new"
  let originalValues = {};

  const fUnicod = document.getElementById('f-unicod');
  const fUninom = document.getElementById('f-uninom');
  const fUnides = document.getElementById('f-unides');
  const fUnistd = document.getElementById('f-unistd');
  const fUnidef = document.getElementById('f-unidef');
  
  const tbody = document.getElementById('uni-tbody');
  const form = document.getElementById('unidadForm');
  const msgArea = document.getElementById('uni-msg-area');
  
  const btnNew = document.getElementById('btn-new');
  const btnSave = document.getElementById('btn-save');
  const btnAnular = document.getElementById('btn-anular');
  const btnDelete = document.getElementById('btn-delete');
  const btnCancel = document.getElementById('btn-cancel');

  // Event listeners
  if (btnNew) btnNew.addEventListener('click', startNew);
  if (btnSave) btnSave.addEventListener('click', saveRecord);
  if (btnAnular) btnAnular.addEventListener('click', toggleStatus);
  if (btnDelete) btnDelete.addEventListener('click', deleteRecord);
  if (btnCancel) btnCancel.addEventListener('click', resetForm);

  // Bind changes check
  [fUninom, fUnides].forEach(input => {
    if (input) {
      input.addEventListener('input', checkForChanges);
      input.addEventListener('change', checkForChanges);
    }
  });
  [fUnistd, fUnidef].forEach(input => {
    if (input) {
      input.addEventListener('change', checkForChanges);
    }
  });

  // Initialize page
  loadUnidades();

  // --- FUNCTIONS ---

  async function loadUnidades() {
    tbody.innerHTML = '<tr><td colspan="5" class="row-empty">Cargando unidades...</td></tr>';
    try {
      const data = await window.AppFetch('/api/maestros/unidades');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="row-empty">No se encontraron unidades registradas.</td></tr>';
      } else {
        data.forEach(item => {
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.className = currentUnicod === item.unicod ? 'row-selected' : '';
          tr.innerHTML = `
            <td><strong>${item.unicod}</strong></td>
            <td>${item.uninom}</td>
            <td>${item.unides}</td>
            <td style="text-align: center;"><span class="badge ${item.unistd ? 'badge--success' : 'badge--danger'}">${item.unistd ? 'Activo' : 'Inactivo'}</span></td>
            <td style="text-align: center;">${item.unidef ? 'Sí' : 'No'}</td>
          `;
          tr.addEventListener('click', () => selectRecord(item));
          tbody.appendChild(tr);
        });
      }

      if (!currentUnicod) {
        await startNew();
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="row-empty" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function selectRecord(item) {
    currentUnicod = item.unicod;
    
    // Populate form
    fUnicod.value = item.unicod;
    fUninom.value = item.uninom;
    fUnides.value = item.unides;
    fUnistd.checked = !!item.unistd;
    fUnidef.checked = !!item.unidef;

    // Cache original values
    originalValues = {
      uninom: item.uninom,
      unides: item.unides,
      unistd: !!item.unistd,
      unidef: !!item.unidef
    };

    // Toggle row class
    Array.from(tbody.children).forEach(tr => {
      tr.classList.remove('row-selected');
      if (tr.querySelector('strong').textContent === item.unicod) {
        tr.classList.add('row-selected');
      }
    });

    hideMessage();
    if (btnAnular) {
      btnAnular.style.display = 'block';
      btnAnular.textContent = item.unistd ? 'ANULAR' : 'ACTIVAR';
      btnAnular.className = item.unistd ? 'btn btn-warning' : 'btn btn-soft';
    }
    if (btnDelete) {
      btnDelete.style.display = 'block';
      btnDelete.textContent = 'BORRAR';
    }

    if (btnSave) btnSave.disabled = true;
  }

  function checkForChanges() {
    if (!currentUnicod) {
      btnSave.disabled = false;
      return;
    }
    const hasChanges = fUninom.value.trim() !== originalValues.uninom ||
                      fUnides.value.trim() !== originalValues.unides ||
                      fUnistd.checked !== originalValues.unistd ||
                      fUnidef.checked !== originalValues.unidef;
    btnSave.disabled = !hasChanges;
  }

  async function startNew() {
    currentUnicod = null;
    originalValues = {};
    form.reset();
    fUnicod.value = '';
    fUnicod.placeholder = 'Cargando...';
    
    if (btnAnular) btnAnular.style.display = 'none';
    if (btnDelete) btnDelete.style.display = 'none';
    if (btnSave) btnSave.disabled = false;
    hideMessage();
    
    Array.from(tbody.children).forEach(tr => tr.classList.remove('row-selected'));
    fUninom.focus();

    try {
      const res = await window.AppFetch('/api/maestros/unidades/next-code');
      fUnicod.value = res.nextCode;
    } catch (err) {
      console.error('Error fetching next code:', err);
      fUnicod.placeholder = 'Error';
    }
  }

  function resetForm() {
    startNew();
  }

  async function saveRecord(e) {
    if (e) e.preventDefault();
    hideMessage();

    const data = {
      uninom: fUninom.value.trim(),
      unides: fUnides.value.trim(),
      unistd: fUnistd.checked,
      unidef: fUnidef.checked
    };

    if (currentUnicod) {
      data.unicod = currentUnicod;
    }

    // Validations
    if (!data.uninom) {
      showMessage('El nombre corto es obligatorio', 'error');
      return;
    }
    if (!data.unides) {
      showMessage('La descripción es obligatoria', 'error');
      return;
    }

    try {
      let res;
      if (currentUnicod) {
        // Edit mode (PUT)
        res = await window.AppFetch(`/api/maestros/unidades/${encodeURIComponent(currentUnicod)}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        // Create mode (POST)
        res = await window.AppFetch('/api/maestros/unidades', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      showMessage(res.message, 'success');
      loadUnidades();
      startNew();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function toggleStatus() {
    if (!currentUnicod) return;
    const trs = Array.from(tbody.children);
    const selectedTr = trs.find(tr => tr.classList.contains('row-selected'));
    if (!selectedTr) return;

    const badge = selectedTr.querySelector('.badge');
    const isCurrentlyActive = badge && badge.textContent === 'Activo';
    const targetStatus = !isCurrentlyActive;

    hideMessage();
    try {
      const res = await window.AppFetch(`/api/maestros/unidades/${encodeURIComponent(currentUnicod)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: targetStatus })
      });
      showMessage(res.message, 'success');
      
      const oldCode = currentUnicod;
      await loadUnidades();
      
      const refreshedTr = Array.from(tbody.children).find(tr => tr.querySelector('strong').textContent === oldCode);
      if (refreshedTr) {
        refreshedTr.click();
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function deleteRecord() {
    if (!currentUnicod) return;

    hideMessage();
    try {
      const res = await window.AppFetch(`/api/maestros/unidades/${encodeURIComponent(currentUnicod)}`, {
        method: 'DELETE'
      });
      showMessage(res.message, 'success');
      loadUnidades();
      startNew();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  function showMessage(msg, type) {
    if (window.StatusBar) {
      window.StatusBar.showMessage(msg, type);
    } else {
      msgArea.textContent = msg;
      msgArea.className = `form-message-area ${type}`;
      msgArea.style.display = 'block';
    }
  }

  function hideMessage() {
    const el = document.querySelector('.form-message-area');
    if (el) el.innerHTML = '';
    msgArea.style.display = 'none';
  }

})();
