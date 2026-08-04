// public/js/modules/maestros_unidades.js
(function() {
  'use strict';

  let currentUnicod = null; // null means "creating new"

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
  const btnDelete = document.getElementById('btn-delete');
  const btnCancel = document.getElementById('btn-cancel');

  // Event listeners
  if (btnNew) btnNew.addEventListener('click', startNew);
  if (btnSave) btnSave.addEventListener('click', saveRecord);
  if (btnDelete) btnDelete.addEventListener('click', deleteRecord);
  if (btnCancel) btnCancel.addEventListener('click', resetForm);

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
        return;
      }

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
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="row-empty" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function selectRecord(item) {
    currentUnicod = item.unicod;
    
    // Populate form
    fUnicod.value = item.unicod;
    document.getElementById('f-unicod-display').textContent = item.unicod;
    document.getElementById('f-unicod-container').style.display = 'block';
    document.getElementById('f-uninom-container').style.gridColumn = 'span 1';
    
    fUninom.value = item.uninom;
    fUnides.value = item.unides;
    fUnistd.checked = !!item.unistd;
    fUnidef.checked = !!item.unidef;

    // Toggle row class
    Array.from(tbody.children).forEach(tr => {
      tr.classList.remove('row-selected');
      if (tr.querySelector('strong').textContent === item.unicod) {
        tr.classList.add('row-selected');
      }
    });

    hideMessage();
    btnDelete.style.display = 'block';
  }

  function startNew() {
    currentUnicod = null;
    form.reset();
    fUnicod.value = '';
    document.getElementById('f-unicod-container').style.display = 'none';
    document.getElementById('f-uninom-container').style.gridColumn = 'span 2';
    fUninom.focus();
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
      uninom: fUninom.value.toUpperCase().trim(),
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

  async function deleteRecord() {
    if (!currentUnicod) return;
    if (!confirm(`¿Está seguro de que desea desactivar la unidad ${currentUnicod}?`)) return;

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
    msgArea.textContent = msg;
    msgArea.className = `form-message-area ${type}`;
    msgArea.style.display = 'block';
  }

  function hideMessage() {
    msgArea.style.display = 'none';
  }

})();
