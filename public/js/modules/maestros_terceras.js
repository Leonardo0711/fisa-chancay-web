// public/js/modules/maestros_terceras.js
(function() {
  'use strict';

  let currentTercod = null; // null means "creating new"
  let originalValues = {};

  const fTercod = document.getElementById('f-tercod');
  const fTernom = document.getElementById('f-ternom');
  const fTerdes = document.getElementById('f-terdes');
  const fTerstd = document.getElementById('f-terstd');
  const fTerdef = document.getElementById('f-terdef');
  
  const tbody = document.getElementById('ter-tbody');
  const form = document.getElementById('terceraForm');
  const msgArea = document.getElementById('ter-msg-area');
  
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
  [fTercod, fTernom, fTerdes].forEach(input => {
    if (input) {
      input.addEventListener('input', checkForChanges);
      input.addEventListener('change', checkForChanges);
    }
  });
  [fTerstd, fTerdef].forEach(input => {
    if (input) {
      input.addEventListener('change', checkForChanges);
    }
  });

  // Initialize page
  loadTerceras();

  // --- FUNCTIONS ---

  async function loadTerceras() {
    tbody.innerHTML = '<tr><td colspan="5" class="row-empty">Cargando empresas terceras...</td></tr>';
    try {
      const data = await window.AppFetch('/api/maestros/terceras');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="row-empty">No se encontraron empresas terceras registradas.</td></tr>';
      } else {
        data.forEach(item => {
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.className = currentTercod === item.tercod ? 'row-selected' : '';
          tr.innerHTML = `
            <td><strong>${item.tercod}</strong></td>
            <td>${item.ternom}</td>
            <td>${item.terdes || '-'}</td>
            <td style="text-align: center;"><span class="badge ${item.terstd ? 'badge--success' : 'badge--danger'}">${item.terstd ? 'Activo' : 'Inactivo'}</span></td>
            <td style="text-align: center;">${item.terdef ? 'Sí' : 'No'}</td>
          `;
          tr.addEventListener('click', () => selectRecord(item));
          tbody.appendChild(tr);
        });
      }

      if (!currentTercod) {
        await startNew();
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="row-empty" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function selectRecord(item) {
    currentTercod = item.tercod;
    
    // Populate form
    fTercod.value = item.tercod;
    fTercod.readOnly = true;
    fTercod.style.background = 'var(--surface-100)';

    fTernom.value = item.ternom;
    fTerdes.value = item.terdes || '';
    fTerstd.checked = !!item.terstd;
    fTerdef.checked = !!item.terdef;

    // Cache original values
    originalValues = {
      tercod: item.tercod,
      ternom: item.ternom,
      terdes: item.terdes || '',
      terstd: !!item.terstd,
      terdef: !!item.terdef
    };

    // Toggle row class
    Array.from(tbody.children).forEach(tr => {
      tr.classList.remove('row-selected');
      const strongEl = tr.querySelector('strong');
      if (strongEl && strongEl.textContent === item.tercod) {
        tr.classList.add('row-selected');
      }
    });

    hideMessage();
    if (btnAnular) {
      btnAnular.style.display = 'block';
      btnAnular.textContent = item.terstd ? 'ANULAR' : 'ACTIVAR';
      btnAnular.className = item.terstd ? 'btn btn-warning' : 'btn btn-soft';
    }
    if (btnDelete) {
      btnDelete.style.display = 'block';
      btnDelete.textContent = 'BORRAR';
    }

    if (btnSave) btnSave.disabled = true;
  }

  function checkForChanges() {
    if (!currentTercod) {
      btnSave.disabled = false;
      return;
    }
    const hasChanges = fTernom.value.trim() !== originalValues.ternom ||
                      fTerdes.value.trim() !== originalValues.terdes ||
                      fTerstd.checked !== originalValues.terstd ||
                      fTerdef.checked !== originalValues.terdef;
    btnSave.disabled = !hasChanges;
  }

  async function startNew() {
    currentTercod = null;
    originalValues = {};
    form.reset();
    fTercod.value = '';
    fTercod.placeholder = 'Cargando...';
    fTercod.readOnly = false;
    fTercod.style.background = '';
    
    if (btnAnular) btnAnular.style.display = 'none';
    if (btnDelete) btnDelete.style.display = 'none';
    if (btnSave) btnSave.disabled = false;
    hideMessage();
    
    Array.from(tbody.children).forEach(tr => tr.classList.remove('row-selected'));
    fTernom.focus();

    try {
      const res = await window.AppFetch('/api/maestros/terceras/next-code');
      if (!currentTercod) {
        fTercod.value = res.nextCode;
      }
    } catch (err) {
      console.error('Error fetching next code for tercera:', err);
      fTercod.placeholder = '00001';
    }
  }

  function resetForm() {
    startNew();
  }

  async function saveRecord(e) {
    if (e) e.preventDefault();
    hideMessage();

    const data = {
      tercod: fTercod.value.trim(),
      ternom: fTernom.value.trim(),
      terdes: fTerdes.value.trim(),
      terstd: fTerstd.checked,
      terdef: fTerdef.checked
    };

    // Validations
    if (!data.tercod) {
      showMessage('El código de la empresa tercera es obligatorio.', 'error');
      fTercod.focus();
      return;
    }
    if (!data.ternom) {
      showMessage('La razón social o nombre es obligatorio.', 'error');
      fTernom.focus();
      return;
    }

    try {
      let res;
      if (currentTercod) {
        // Edit mode (PUT)
        res = await window.AppFetch(`/api/maestros/terceras/${encodeURIComponent(currentTercod)}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        // Create mode (POST)
        res = await window.AppFetch('/api/maestros/terceras', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      showMessage(res.message, 'success');
      await loadTerceras();
      startNew();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function toggleStatus() {
    if (!currentTercod) return;
    const trs = Array.from(tbody.children);
    const selectedTr = trs.find(tr => tr.classList.contains('row-selected'));
    if (!selectedTr) return;

    const badge = selectedTr.querySelector('.badge');
    const isCurrentlyActive = badge && badge.textContent === 'Activo';
    const targetStatus = !isCurrentlyActive;

    hideMessage();
    try {
      const res = await window.AppFetch(`/api/maestros/terceras/${encodeURIComponent(currentTercod)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: targetStatus })
      });
      showMessage(res.message, 'success');
      
      const oldCode = currentTercod;
      await loadTerceras();
      
      const refreshedTr = Array.from(tbody.children).find(tr => {
        const strongEl = tr.querySelector('strong');
        return strongEl && strongEl.textContent === oldCode;
      });
      if (refreshedTr) {
        refreshedTr.click();
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function deleteRecord() {
    if (!currentTercod) return;

    if (!confirm(`¿Está seguro de eliminar la empresa tercera "${fTernom.value.trim()}"?`)) {
      return;
    }

    hideMessage();
    try {
      const res = await window.AppFetch(`/api/maestros/terceras/${encodeURIComponent(currentTercod)}`, {
        method: 'DELETE'
      });
      showMessage(res.message, 'success');
      await loadTerceras();
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
    const el = document.querySelector('#ter-msg-area');
    if (el) {
      el.innerHTML = '';
      el.style.display = 'none';
    }
  }

})();
