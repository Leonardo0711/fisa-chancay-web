// public/js/modules/maestros_ubicaciones_producto.js
(function() {
  'use strict';

  let currentKey = null; // Object { procod, ubicod } when editing, null when creating new
  let originalValues = {};

  const fProcod = document.getElementById('f-procod');
  const fUbicod = document.getElementById('f-ubicod');
  const fCantidad = document.getElementById('f-cantidad');
  const fUnicodCant = document.getElementById('f-unicod_cant');
  const fValorUnitario = document.getElementById('f-valor_unitario');
  const fUnicodVu = document.getElementById('f-unicod_vu');
  const fTarifa = document.getElementById('f-tarifa');
  
  const tbody = document.getElementById('map-tbody');
  const form = document.getElementById('mapeoForm');
  const msgArea = document.getElementById('map-msg-area');
  
  const btnNew = document.getElementById('btn-new');
  const btnSave = document.getElementById('btn-save');
  const btnDelete = document.getElementById('btn-delete');
  const btnCancel = document.getElementById('btn-cancel');

  // Product Lookup Modal
  const btnBuscarProducto = document.getElementById('btnBuscarProducto');
  const modalProducto = document.getElementById('modalProducto');
  const btnCloseModalProd = document.getElementById('btnCloseModalProd');
  const modalProdSearch = document.getElementById('modalProdSearch');
  const modalProdTbody = document.getElementById('modalProdTbody');

  // Event listeners
  if (btnNew) btnNew.addEventListener('click', startNew);
  if (btnSave) btnSave.addEventListener('click', saveRecord);
  if (btnDelete) btnDelete.addEventListener('click', deleteRecord);
  if (btnCancel) btnCancel.addEventListener('click', resetForm);

  // Bind changes check
  [fProcod, fUbicod, fCantidad, fUnicodCant, fValorUnitario, fUnicodVu, fTarifa].forEach(input => {
    if (input) {
      input.addEventListener('input', checkForChanges);
      input.addEventListener('change', checkForChanges);
    }
  });

  if (btnBuscarProducto) btnBuscarProducto.addEventListener('click', openProdModal);
  if (btnCloseModalProd) btnCloseModalProd.addEventListener('click', closeProdModal);

  let searchTimeout = null;
  if (modalProdSearch) {
    modalProdSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(performProductSearch, 300);
    });
  }

  // Initialize page
  initPage();

  // --- FUNCTIONS ---

  async function initPage() {
    await loadSelectors();
    await loadMappings();
  }

  async function loadSelectors() {
    try {
      // Load locations
      const locs = await window.AppFetch('/api/maestros/ubicaciones');
      fUbicod.innerHTML = '<option value="">SELECCIONE UBICACIÓN</option>';
      locs.forEach(item => {
        if (item.ubistd) {
          const opt = document.createElement('option');
          opt.value = item.ubicod;
          opt.textContent = `${item.ubicod} - ${item.ubinom} (${item.tiptra === 'D' ? 'Destajo' : 'Jornal'})`;
          fUbicod.appendChild(opt);
        }
      });

      // Load units
      const units = await window.AppFetch('/api/maestros/unidades');
      const optHtml = ['<option value="">SELECCIONE UNIDAD</option>'];
      units.forEach(item => {
        if (item.unistd) {
          optHtml.push(`<option value="${item.unicod}">${item.unicod} - ${item.unides}</option>`);
        }
      });
      fUnicodCant.innerHTML = optHtml.join('');
      fUnicodVu.innerHTML = optHtml.join('');
    } catch (err) {
      console.error('Error al cargar selectores:', err.message);
    }
  }

  async function loadMappings() {
    tbody.innerHTML = '<tr><td colspan="7" class="row-empty">Cargando mapeos de producto...</td></tr>';
    try {
      const data = await window.AppFetch('/api/maestros/ubicaciones-producto');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="row-empty">No se encontraron relaciones registradas.</td></tr>';
        return;
      }

      data.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        
        const isSelected = currentKey && currentKey.procod === item.procod && currentKey.ubicod === item.ubicod;
        tr.className = isSelected ? 'row-selected' : '';

        const qtyTxt = item.cantidad !== null ? item.cantidad : '---';
        const vuTxt = item.valor_unitario !== null ? item.valor_unitario.toFixed(4) : '---';
        const tarifaTxt = item.tarifa !== null ? item.tarifa.toFixed(2) : '---';

        tr.innerHTML = `
          <td><strong>${item.procod}</strong></td>
          <td>${item.ubicod} - ${item.ubinom}</td>
          <td style="text-align: center;">${qtyTxt}</td>
          <td>${item.unicod_cant ? `${item.unicod_cant} (${item.unides_cant})` : '---'}</td>
          <td style="text-align: center;">${vuTxt}</td>
          <td>${item.unicod_vu ? `${item.unicod_vu} (${item.unides_vu})` : '---'}</td>
          <td style="text-align: center;">${tarifaTxt}</td>
        `;
        tr.addEventListener('click', () => selectRecord(item));
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="row-empty" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function selectRecord(item) {
    currentKey = { procod: item.procod, ubicod: item.ubicod };
    
    // Populate form
    fProcod.value = item.procod;
    fProcod.disabled = true; // compound PK component locked
    btnBuscarProducto.disabled = true;
    fUbicod.value = item.ubicod;
    fUbicod.disabled = true; // compound PK component locked
    
    fCantidad.value = item.cantidad !== null ? item.cantidad : '';
    fUnicodCant.value = item.unicod_cant || '';
    fValorUnitario.value = item.valor_unitario !== null ? item.valor_unitario : '';
    fUnicodVu.value = item.unicod_vu || '';
    fTarifa.value = item.tarifa !== null ? item.tarifa : '';

    // Cache original values
    originalValues = {
      procod: item.procod,
      ubicod: item.ubicod,
      cantidad: String(item.cantidad !== null ? item.cantidad : ''),
      unicod_cant: item.unicod_cant || '',
      valor_unitario: String(item.valor_unitario !== null ? item.valor_unitario : ''),
      unicod_vu: item.unicod_vu || '',
      tarifa: String(item.tarifa !== null ? item.tarifa : '')
    };

    // Toggle row class
    Array.from(tbody.children).forEach(tr => {
      tr.classList.remove('row-selected');
      const isMatch = tr.querySelector('strong').textContent === item.procod && 
                      tr.children[1].textContent.startsWith(item.ubicod);
      if (isMatch) {
        tr.classList.add('row-selected');
      }
    });

    hideMessage();
    btnDelete.style.display = 'block';
    if (btnSave) btnSave.disabled = true;
  }

  function checkForChanges() {
    if (!currentKey) {
      btnSave.disabled = false;
      return;
    }
    const hasChanges = fProcod.value !== originalValues.procod ||
                      fUbicod.value !== originalValues.ubicod ||
                      fCantidad.value.trim() !== originalValues.cantidad ||
                      fUnicodCant.value !== originalValues.unicod_cant ||
                      fValorUnitario.value.trim() !== originalValues.valor_unitario ||
                      fUnicodVu.value !== originalValues.unicod_vu ||
                      fTarifa.value.trim() !== originalValues.tarifa;
    btnSave.disabled = !hasChanges;
  }

  function startNew() {
    currentKey = null;
    originalValues = {};
    form.reset();
    fProcod.disabled = false;
    btnBuscarProducto.disabled = false;
    fUbicod.disabled = false;
    fProcod.focus();
    btnDelete.style.display = 'none';
    if (btnSave) btnSave.disabled = false;
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
      procod: fProcod.value.toUpperCase().trim(),
      ubicod: fUbicod.value,
      cantidad: fCantidad.value !== '' ? parseFloat(fCantidad.value) : null,
      unicod_cant: fUnicodCant.value || null,
      valor_unitario: fValorUnitario.value !== '' ? parseFloat(fValorUnitario.value) : null,
      unicod_vu: fUnicodVu.value || null,
      tarifa: fTarifa.value !== '' ? parseFloat(fTarifa.value) : null
    };

    // Validations
    if (!data.procod) {
      showMessage('El código de producto es obligatorio', 'error');
      return;
    }
    if (!data.ubicod) {
      showMessage('Seleccione la ubicación', 'error');
      return;
    }

    try {
      let res;
      if (currentKey) {
        // Edit mode (PUT)
        res = await window.AppFetch(`/api/maestros/ubicaciones-producto/${encodeURIComponent(currentKey.procod)}/${encodeURIComponent(currentKey.ubicod)}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        // Create mode (POST)
        res = await window.AppFetch('/api/maestros/ubicaciones-producto', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      showMessage(res.message, 'success');
      loadMappings();
      startNew();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function deleteRecord() {
    if (!currentKey) return;

    hideMessage();
    try {
      const res = await window.AppFetch(`/api/maestros/ubicaciones-producto/${encodeURIComponent(currentKey.procod)}/${encodeURIComponent(currentKey.ubicod)}`, {
        method: 'DELETE'
      });
      showMessage(res.message, 'success');
      loadMappings();
      startNew();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  // --- Product Lookup Modal ---

  function openProdModal() {
    modalProducto.classList.add('active');
    modalProdSearch.value = '';
    modalProdTbody.innerHTML = '<tr class="row-empty"><td colspan="3">Ingrese un término de búsqueda para ver productos.</td></tr>';
    modalProdSearch.focus();
  }

  function closeProdModal() {
    modalProducto.classList.remove('active');
  }

  async function performProductSearch() {
    const q = modalProdSearch.value.trim();
    if (q.length < 3) {
      modalProdTbody.innerHTML = '<tr class="row-empty"><td colspan="3">Ingrese al menos 3 caracteres para buscar.</td></tr>';
      return;
    }

    modalProdTbody.innerHTML = '<tr class="row-empty"><td colspan="3">Buscando productos en OTs de Solver...</td></tr>';
    try {
      const data = await window.AppFetch(`/api/produccion/ots?q=${encodeURIComponent(q)}`);
      
      // Deduplicate products in result
      const seen = new Set();
      const uniqueProds = [];
      data.forEach(ot => {
        if (!seen.has(ot.procod)) {
          seen.add(ot.procod);
          uniqueProds.push(ot);
        }
      });

      if (uniqueProds.length === 0) {
        modalProdTbody.innerHTML = '<tr class="row-empty"><td colspan="3">No se encontraron productos coincidentes.</td></tr>';
        return;
      }

      modalProdTbody.innerHTML = '';
      uniqueProds.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td><strong>${item.procod}</strong></td>
          <td>${item.pronom}</td>
          <td><span class="badge badge--pill" style="background:var(--surface-100);">${item.univen}</span></td>
        `;
        tr.addEventListener('click', () => {
          fProcod.value = item.procod;
          closeProdModal();
          fUbicod.focus();
        });
        modalProdTbody.appendChild(tr);
      });
    } catch (err) {
      modalProdTbody.innerHTML = `<tr class="row-empty"><td colspan="3" style="color:var(--danger);">${err.message}</td></tr>`;
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
