// public/js/modules/maestros_ubicaciones.js
(function() {
  'use strict';

  let currentUbicod = null; // null means "creating new"
  let originalValues = {};

  const fUbicod = document.getElementById('f-ubicod');
  const fUbinom = document.getElementById('f-ubinom');
  const fUbides = document.getElementById('f-ubides');
  const fTiptra = document.getElementById('f-tiptra');
  const fUnicod = document.getElementById('f-unicod');
  const fUbiuni = document.getElementById('f-ubiuni');
  const fUbistd = document.getElementById('f-ubistd');
  const fUbidef = document.getElementById('f-ubidef');
  
  const tbody = document.getElementById('ubi-tbody');
  const form = document.getElementById('ubicacionForm');
  const msgArea = document.getElementById('ubi-msg-area');
  
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
  [fUbinom, fUbides, fUnicod, fTiptra].forEach(input => {
    if (input) {
      input.addEventListener('input', checkForChanges);
      input.addEventListener('change', checkForChanges);
    }
  });
  [fUbiuni, fUbistd, fUbidef].forEach(input => {
    if (input) {
      input.addEventListener('change', checkForChanges);
    }
  });

  // Initialize page
  initPage();

  // --- FUNCTIONS ---

  async function initPage() {
    await loadUnidades();
    await loadUbicaciones();
  }

  async function loadUnidades() {
    try {
      const data = await window.AppFetch('/api/maestros/unidades');
      fUnicod.innerHTML = '<option value="">SELECCIONE UNIDAD</option>';
      data.forEach(item => {
        if (item.unistd) {
          const opt = document.createElement('option');
          opt.value = item.unicod;
          opt.textContent = `${item.unicod} - ${item.unides}`;
          fUnicod.appendChild(opt);
        }
      });
    } catch (err) {
      console.error('Error al cargar unidades:', err.message);
    }
  }

  async function loadUbicaciones() {
    tbody.innerHTML = '<tr><td colspan="7" class="row-empty">Cargando ubicaciones...</td></tr>';
    try {
      const data = await window.AppFetch('/api/maestros/ubicaciones');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="row-empty">No se encontraron ubicaciones registradas.</td></tr>';
      } else {
        data.forEach(item => {
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.className = currentUbicod === item.ubicod ? 'row-selected' : '';
          
          const trabajoTxt = item.tiptra === 'D' ? 'Destajo' : 'Jornal';
          const universalTxt = item.ubiuni ? 'Universal' : 'No Universal';

          tr.innerHTML = `
            <td><strong>${item.ubicod}</strong></td>
            <td>${item.ubinom}</td>
            <td>${item.ubides || ''}</td>
            <td><span class="badge badge--pill" style="background:var(--surface-100);">${trabajoTxt}</span></td>
            <td><span class="badge badge--pill" style="background:var(--surface-100);">${universalTxt}</span></td>
            <td style="text-align: center;"><span class="badge ${item.ubistd ? 'badge--success' : 'badge--danger'}">${item.ubistd ? 'Activo' : 'Inactivo'}</span></td>
            <td style="text-align: center;">${item.ubidef ? 'Sí' : 'No'}</td>
          `;
          tr.addEventListener('click', () => selectRecord(item));
          tbody.appendChild(tr);
        });
      }

      if (!currentUbicod) {
        await startNew();
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="row-empty" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function selectRecord(item) {
    currentUbicod = item.ubicod;
    
    // Populate form
    fUbicod.value = item.ubicod;
    fUbinom.value = item.ubinom;
    fUbides.value = item.ubides || '';
    fTiptra.value = item.tiptra;
    fUnicod.value = item.unicod || '';
    fUbiuni.checked = !!item.ubiuni;
    fUbistd.checked = !!item.ubistd;
    fUbidef.checked = !!item.ubidef;

    // Cache original values
    originalValues = {
      ubinom: item.ubinom,
      ubides: item.ubides || '',
      tiptra: item.tiptra,
      unicod: item.unicod || '',
      ubiuni: !!item.ubiuni,
      ubistd: !!item.ubistd,
      ubidef: !!item.ubidef
    };

    // Toggle row class
    Array.from(tbody.children).forEach(tr => {
      tr.classList.remove('row-selected');
      if (tr.querySelector('strong').textContent === item.ubicod) {
        tr.classList.add('row-selected');
      }
    });

    hideMessage();
    if (btnAnular) {
      btnAnular.style.display = 'block';
      btnAnular.textContent = item.ubistd ? 'ANULAR' : 'ACTIVAR';
      btnAnular.className = item.ubistd ? 'btn btn-warning' : 'btn btn-soft';
    }
    if (btnDelete) {
      btnDelete.style.display = 'block';
      btnDelete.textContent = 'BORRAR';
    }

    if (btnSave) btnSave.disabled = true;
  }

  function checkForChanges() {
    if (!currentUbicod) {
      btnSave.disabled = false;
      return;
    }
    const hasChanges = fUbinom.value.trim() !== originalValues.ubinom ||
                      fUbides.value.trim() !== originalValues.ubides ||
                      fTiptra.value !== originalValues.tiptra ||
                      fUnicod.value !== originalValues.unicod ||
                      fUbiuni.checked !== originalValues.ubiuni ||
                      fUbistd.checked !== originalValues.ubistd ||
                      fUbidef.checked !== originalValues.ubidef;
    btnSave.disabled = !hasChanges;
  }

  async function startNew() {
    currentUbicod = null;
    originalValues = {};
    form.reset();
    fUbicod.value = '';
    fUbicod.placeholder = 'Cargando...';
    
    if (btnAnular) btnAnular.style.display = 'none';
    if (btnDelete) btnDelete.style.display = 'none';
    if (btnSave) btnSave.disabled = false;
    hideMessage();
    
    Array.from(tbody.children).forEach(tr => tr.classList.remove('row-selected'));
    fUbinom.focus();

    try {
      const res = await window.AppFetch('/api/maestros/ubicaciones/next-code');
      fUbicod.value = res.nextCode;
    } catch (err) {
      console.error('Error fetching next code:', err);
      fUbicod.placeholder = 'Error';
    }
  }

  function resetForm() {
    startNew();
  }

  async function saveRecord(e) {
    if (e) e.preventDefault();
    hideMessage();

    const data = {
      ubinom: fUbinom.value.trim(),
      ubides: fUbides.value.trim(),
      tiptra: fTiptra.value,
      unicod: fUnicod.value,
      ubiuni: fUbiuni.checked,
      ubistd: fUbistd.checked,
      ubidef: fUbidef.checked
    };

    if (currentUbicod) {
      data.ubicod = currentUbicod;
    }

    // Validations
    if (!data.ubinom) {
      showMessage('El nombre de la ubicación es obligatorio', 'error');
      return;
    }
    if (!data.tiptra) {
      showMessage('Seleccione el tipo de trabajo', 'error');
      return;
    }
    if (!data.unicod) {
      showMessage('Seleccione la unidad de medida asociada', 'error');
      return;
    }

    try {
      let res;
      if (currentUbicod) {
        // Edit mode (PUT)
        res = await window.AppFetch(`/api/maestros/ubicaciones/${encodeURIComponent(currentUbicod)}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        // Create mode (POST)
        res = await window.AppFetch('/api/maestros/ubicaciones', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      showMessage(res.message, 'success');
      loadUbicaciones();
      startNew();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function toggleStatus() {
    if (!currentUbicod) return;
    const trs = Array.from(tbody.children);
    const selectedTr = trs.find(tr => tr.classList.contains('row-selected'));
    if (!selectedTr) return;

    const badge = selectedTr.querySelectorAll('.badge')[1]; // second badge is active status
    const isCurrentlyActive = badge && badge.textContent === 'Activo';
    const targetStatus = !isCurrentlyActive;

    hideMessage();
    try {
      const res = await window.AppFetch(`/api/maestros/ubicaciones/${encodeURIComponent(currentUbicod)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: targetStatus })
      });
      showMessage(res.message, 'success');
      
      const oldCode = currentUbicod;
      await loadUbicaciones();
      
      const refreshedTr = Array.from(tbody.children).find(tr => tr.querySelector('strong').textContent === oldCode);
      if (refreshedTr) {
        refreshedTr.click();
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function deleteRecord() {
    if (!currentUbicod) return;

    hideMessage();
    try {
      const res = await window.AppFetch(`/api/maestros/ubicaciones/${encodeURIComponent(currentUbicod)}`, {
        method: 'DELETE'
      });
      showMessage(res.message, 'success');
      loadUbicaciones();
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
