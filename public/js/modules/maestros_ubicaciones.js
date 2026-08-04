// public/js/modules/maestros_ubicaciones.js
(function() {
  'use strict';

  let currentUbicod = null; // null means "creating new"

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
  const btnDelete = document.getElementById('btn-delete');
  const btnCancel = document.getElementById('btn-cancel');

  // Event listeners
  if (btnNew) btnNew.addEventListener('click', startNew);
  if (btnSave) btnSave.addEventListener('click', saveRecord);
  if (btnDelete) btnDelete.addEventListener('click', deleteRecord);
  if (btnCancel) btnCancel.addEventListener('click', resetForm);

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
        return;
      }

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
          <td style="text-align: center;"><span class="badge ${item.tiptra === 'D' ? 'badge--info' : 'badge--primary'}">${trabajoTxt}</span></td>
          <td style="text-align: center;">${universalTxt}</td>
          <td>${item.unicod} - ${item.unides || 'SIN UNIDAD'}</td>
          <td style="text-align: center;"><span class="badge ${item.ubistd ? 'badge--success' : 'badge--danger'}">${item.ubistd ? 'Activo' : 'Inactivo'}</span></td>
        `;
        tr.addEventListener('click', () => selectRecord(item));
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="row-empty" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function selectRecord(item) {
    currentUbicod = item.ubicod;
    
    // Populate form
    fUbicod.value = item.ubicod;
    document.getElementById('f-ubicod-display').textContent = item.ubicod;
    document.getElementById('f-ubicod-container').style.display = 'block';
    document.getElementById('f-ubinom-container').style.gridColumn = 'span 1';
    
    fUbinom.value = item.ubinom;
    fUbides.value = item.ubides || '';
    fTiptra.value = item.tiptra;
    fUnicod.value = item.unicod;
    fUbiuni.checked = !!item.ubiuni;
    fUbistd.checked = !!item.ubistd;
    fUbidef.checked = !!item.ubidef;

    // Toggle row class
    Array.from(tbody.children).forEach(tr => {
      tr.classList.remove('row-selected');
      if (tr.querySelector('strong').textContent === item.ubicod) {
        tr.classList.add('row-selected');
      }
    });

    hideMessage();
    btnDelete.style.display = 'block';
  }

  function startNew() {
    currentUbicod = null;
    form.reset();
    fUbicod.value = '';
    document.getElementById('f-ubicod-container').style.display = 'none';
    document.getElementById('f-ubinom-container').style.gridColumn = 'span 2';
    fUbinom.focus();
    btnDelete.style.display = 'none';
    hideMessage();
    
    Array.from(tbody.children).forEach(tr => tr.classList.remove('row-selected'));
  }

  function resetForm() {
    startNew();
  }

  async function saveRecord(e) {
    if (e) e.preventDefault();
    hideMessage();

    const data = {
      ubinom: fUbinom.value.toUpperCase().trim(),
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

  async function deleteRecord() {
    if (!currentUbicod) return;
    if (!confirm(`¿Está seguro de que desea desactivar la ubicación ${currentUbicod}?`)) return;

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
    msgArea.textContent = msg;
    msgArea.className = `form-message-area ${type}`;
    msgArea.style.display = 'block';
  }

  function hideMessage() {
    msgArea.style.display = 'none';
  }

})();
