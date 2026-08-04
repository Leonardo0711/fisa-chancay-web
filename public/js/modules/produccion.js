// public/js/modules/produccion.js
(function() {
  'use strict';

  // State management
  let activeOt = null;
  let activeProduct = null;
  let locationsConfig = {};
  let operariosList = [];
  let selectedOperarios = new Map(); // Key: usucod, Value: operario object

  // DOM Elements
  const btnBuscarOt = document.getElementById('btnBuscarOt');
  const inputOt = document.getElementById('f-otcod');
  const selectUbicacion = document.getElementById('f-ubicod');
  const selectLote = document.getElementById('f-lote');
  const inputCantidadIngresar = document.getElementById('f-cantidadIngresar');
  const inputVuIngresar = document.getElementById('f-vuIngresar');
  const btnAgregarOperario = document.getElementById('btnAgregarOperario');
  const operariosTbody = document.getElementById('operarios-tbody');
  const alertArea = document.getElementById('alertArea');
  const btnAccept = document.getElementById('btnAccept');
  const btnCancel = document.getElementById('btnCancel');

  // Modal OT Elements
  const modalOt = document.getElementById('modalOt');
  const btnCloseModalOt = document.getElementById('btnCloseModalOt');
  const modalOtSearch = document.getElementById('modalOtSearch');
  const modalOtTbody = document.getElementById('modalOtTbody');

  // Modal Operario Elements
  const modalOperario = document.getElementById('modalOperario');
  const btnCloseModalOp = document.getElementById('btnCloseModalOp');
  const btnCancelOp = document.getElementById('btnCancelOp');
  const btnAcceptOp = document.getElementById('btnAcceptOp');
  const modalOpSearch = document.getElementById('modalOpSearch');
  const modalOpTbody = document.getElementById('modalOpTbody');

  // Dynamic Label Elements
  const lblProcod = document.getElementById('lbl-procod');
  const lblPronom = document.getElementById('lbl-pronom');
  const lblCanreq = document.getElementById('lbl-canreq');
  const lblUbiuni = document.getElementById('lbl-ubiuni');
  const lblValores = document.getElementById('lbl-valores');
  const lblUnidadLbl = document.getElementById('lbl-unidad-lbl');
  const lblLoteProgress = document.getElementById('lbl-lote-progress');
  const badgCant = document.getElementById('f-cant-lbl-badge');
  const badgVu = document.getElementById('f-vu-lbl-badge');

  // Event Listeners
  if (btnBuscarOt && inputOt) {
    btnBuscarOt.addEventListener('click', openOtModal);
    inputOt.addEventListener('click', openOtModal);
  }
  if (btnCloseModalOt) btnCloseModalOt.addEventListener('click', closeOtModal);

  let searchTimeout = null;
  if (modalOtSearch) {
    modalOtSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(performOtSearch, 300);
    });
  }

  if (selectUbicacion) {
    selectUbicacion.addEventListener('change', handleUbicacionChange);
  }

  if (inputVuIngresar) {
    inputVuIngresar.addEventListener('input', recalculateWorkerValues);
  }

  if (btnAgregarOperario) {
    btnAgregarOperario.addEventListener('click', openOperarioModal);
  }
  if (btnCloseModalOp) btnCloseModalOp.addEventListener('click', closeOperarioModal);
  if (btnCancelOp) btnCancelOp.addEventListener('click', closeOperarioModal);
  if (btnAcceptOp) btnAcceptOp.addEventListener('click', addSelectedOperarios);

  if (modalOpSearch) {
    modalOpSearch.addEventListener('input', filterOperariosTable);
  }

  if (btnAccept) btnAccept.addEventListener('click', handleSubmit);
  if (btnCancel) btnCancel.addEventListener('click', handleCancel);

  // Initialize
  loadUbicaciones();

  // --- Functions ---

  function openOtModal() {
    modalOt.classList.add('active');
    modalOtSearch.value = '';
    modalOtTbody.innerHTML = '<tr class="row-empty"><td colspan="6">Ingrese un término de búsqueda para ver OTs.</td></tr>';
    modalOtSearch.focus();
  }

  function closeOtModal() {
    modalOt.classList.remove('active');
  }

  async function performOtSearch() {
    const q = modalOtSearch.value.trim();
    if (q.length < 3) {
      modalOtTbody.innerHTML = '<tr class="row-empty"><td colspan="6">Ingrese al menos 3 caracteres para buscar.</td></tr>';
      return;
    }

    modalOtTbody.innerHTML = '<tr class="row-empty"><td colspan="6">Buscando OTs...</td></tr>';
    try {
      const data = await window.AppFetch(`/api/produccion/ots?q=${encodeURIComponent(q)}`);
      if (data.length === 0) {
        modalOtTbody.innerHTML = '<tr class="row-empty"><td colspan="6">No se encontraron resultados.</td></tr>';
        return;
      }

      modalOtTbody.innerHTML = '';
      data.forEach(ot => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td><strong>${ot.otcod}</strong></td>
          <td>${ot.clinomcom}</td>
          <td>${ot.ovcod}</td>
          <td>${ot.procod}</td>
          <td>${ot.pronom}</td>
          <td style="text-align: center;">${ot.canreq} ${ot.univen}</td>
        `;
        tr.addEventListener('click', () => selectOt(ot));
        modalOtTbody.appendChild(tr);
      });
    } catch (err) {
      modalOtTbody.innerHTML = `<tr class="row-empty"><td colspan="6" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  async function selectOt(ot) {
    activeOt = ot.otcod;
    activeProduct = ot.procod;
    inputOt.value = ot.otcod;
    
    lblProcod.textContent = ot.procod;
    lblPronom.textContent = ot.pronom;
    lblCanreq.textContent = `${ot.canreq} ${ot.univen}`;

    closeOtModal();
    showAlert('Orden de Trabajo cargada correctamente', 'success');

    // Reset Form fields
    selectUbicacion.value = '';
    selectUbicacion.disabled = false;
    selectLote.innerHTML = '<option value="">SELECCIONE LOTE</option>';
    selectLote.disabled = true;
    lblLoteProgress.textContent = '---';
    inputCantidadIngresar.value = '';
    inputVuIngresar.value = '';
    
    // Clear operarios
    selectedOperarios.clear();
    renderSelectedOperarios();
    btnAgregarOperario.disabled = true;

    // Load Lotes for the selected OT
    try {
      const lotes = await window.AppFetch(`/api/produccion/ots/${encodeURIComponent(ot.otcod)}/lotes`);
      selectLote.innerHTML = '<option value="">SELECCIONE LOTE</option>';
      if (lotes.length > 0) {
        selectLote.disabled = false;
        lotes.forEach(l => {
          const opt = document.createElement('option');
          opt.value = l.lotcod;
          opt.textContent = l.lotcod;
          opt.dataset.avance = l.avance;
          selectLote.appendChild(opt);
        });
        
        selectLote.addEventListener('change', () => {
          const selectedOpt = selectLote.options[selectLote.selectedIndex];
          lblLoteProgress.textContent = selectedOpt.dataset.avance || '---';
        });
      }
    } catch (err) {
      console.error('Error al cargar lotes:', err.message);
    }

    // Load Location configurations for the selected Product
    try {
      locationsConfig = await window.AppFetch(`/api/produccion/ubicaciones/producto/${encodeURIComponent(ot.procod)}`);
    } catch (err) {
      console.error('Error al cargar configuraciones de ubicación:', err.message);
    }
  }

  async function loadUbicaciones() {
    try {
      const data = await window.AppFetch('/api/produccion/ubicaciones');
      selectUbicacion.innerHTML = '<option value="">SELECCIONE UBICACIÓN</option>';
      data.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.ubicod;
        opt.textContent = `${u.ubicod} - ${u.ubinom}`;
        opt.dataset.tiptra = u.tiptra;
        opt.dataset.ubiuni = u.ubiuni ? '1' : '0';
        selectUbicacion.appendChild(opt);
      });
    } catch (err) {
      console.error('Error al cargar ubicaciones:', err.message);
    }
  }

  function handleUbicacionChange() {
    const ubicod = selectUbicacion.value;
    if (!ubicod) {
      resetUbicacionFields();
      return;
    }

    const config = locationsConfig[ubicod];
    if (!config) {
      showAlert('No hay configuración de ubicación para este producto', 'warning');
      resetUbicacionFields();
      return;
    }

    btnAgregarOperario.disabled = false;

    // Apply Case logic
    const tiptra = config.tiptra; // 'D' or 'J'
    const ubiuni = config.ubiuni; // true or false

    // Set Trabajo Type radio button
    if (tiptra === 'D') {
      document.getElementById('f-tiptra-destajo').checked = true;
      document.getElementById('f-tiptra-jornal').checked = false;
    } else {
      document.getElementById('f-tiptra-destajo').checked = false;
      document.getElementById('f-tiptra-jornal').checked = true;
    }

    // Set Location indicators
    lblUbiuni.value = ubiuni ? 'UNIVERSAL' : 'NO UNIVERSAL';
    
    const uCant = config.unidadCant || '---';
    const uVu = config.unidadVu || '---';
    lblUnidadLbl.textContent = `${uCant} / ${uVu}`;

    const cantVal = config.cantidad !== null ? config.cantidad : '---';
    const vuVal = config.valorUnitario !== null ? config.valorUnitario.toFixed(2) : '---';
    lblValores.value = `${cantVal} / ${vuVal}`;

    // Quantities inputs logic according to Case
    if (tiptra === 'D' && !ubiuni) {
      // CASE 1: Destajo y No Universal
      // Quantities are pre-defined and locked
      inputCantidadIngresar.value = config.cantidad || 0;
      inputCantidadIngresar.readOnly = true;
      inputCantidadIngresar.style.background = 'var(--surface-100)';
      badgCant.textContent = uCant;

      inputVuIngresar.value = config.valorUnitario || 0;
      inputVuIngresar.readOnly = true;
      inputVuIngresar.style.background = 'var(--surface-100)';
      badgVu.textContent = uVu;

      document.getElementById('vuFieldGroup').style.display = 'block';
      document.getElementById('loteFieldGroup').style.display = 'block';
      selectLote.required = true;
    } 
    else if (tiptra === 'D' && ubiuni) {
      // CASE 2: Destajo y Universal
      // Quantities are editable. VU is editable but pre-filled.
      inputCantidadIngresar.value = '';
      inputCantidadIngresar.readOnly = false;
      inputCantidadIngresar.style.background = '#fff';
      badgCant.textContent = '---';

      inputVuIngresar.value = config.valorUnitario || 0;
      inputVuIngresar.readOnly = false;
      inputVuIngresar.style.background = '#fff';
      badgVu.textContent = uVu;

      document.getElementById('vuFieldGroup').style.display = 'block';
      document.getElementById('loteFieldGroup').style.display = 'none'; // hidden for universal Destajo
      selectLote.required = false;
    }
    else {
      // CASE 3: Jornal
      // Quantity is editable. VU is disabled/not-applicable.
      inputCantidadIngresar.value = '';
      inputCantidadIngresar.readOnly = false;
      inputCantidadIngresar.style.background = '#fff';
      badgCant.textContent = uCant;

      inputVuIngresar.value = '';
      inputVuIngresar.readOnly = true;
      inputVuIngresar.style.background = 'var(--surface-100)';
      badgVu.textContent = '---';

      document.getElementById('vuFieldGroup').style.display = 'none'; // hidden for Jornal
      document.getElementById('loteFieldGroup').style.display = 'none'; // hidden for Jornal
      selectLote.required = false;
    }

    // Refresh operarios calculations
    recalculateWorkerValues();
  }

  function resetUbicacionFields() {
    document.getElementById('f-tiptra-destajo').checked = true;
    lblUbiuni.value = '---';
    lblUnidadLbl.textContent = 'CANTIDAD / VALOR';
    lblValores.value = '---';
    inputCantidadIngresar.value = '';
    inputCantidadIngresar.readOnly = false;
    inputCantidadIngresar.style.background = '#fff';
    inputVuIngresar.value = '';
    inputVuIngresar.readOnly = false;
    inputVuIngresar.style.background = '#fff';
    badgCant.textContent = '---';
    badgVu.textContent = '---';
    
    document.getElementById('vuFieldGroup').style.display = 'block';
    document.getElementById('loteFieldGroup').style.display = 'block';
    btnAgregarOperario.disabled = true;

    selectedOperarios.clear();
    renderSelectedOperarios();
  }

  // --- Operarios Modal ---

  async function openOperarioModal() {
    modalOperario.classList.add('active');
    modalOpSearch.value = '';
    
    modalOpTbody.innerHTML = '<tr class="row-empty"><td colspan="4">Cargando operarios...</td></tr>';
    
    try {
      const data = await window.AppFetch('/api/produccion/operarios');
      operariosList = data;
      renderOperariosModalList();
    } catch (err) {
      modalOpTbody.innerHTML = `<tr class="row-empty"><td colspan="4" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function closeOperarioModal() {
    modalOperario.classList.remove('active');
  }

  function renderOperariosModalList() {
    modalOpTbody.innerHTML = '';
    const q = modalOpSearch.value.trim().toLowerCase();

    const filtered = operariosList.filter(o => 
      o.usucod.toLowerCase().includes(q) || 
      o.usunom.toLowerCase().includes(q) ||
      o.cargo.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      modalOpTbody.innerHTML = '<tr class="row-empty"><td colspan="4">No se encontraron operarios.</td></tr>';
      return;
    }

    filtered.forEach(o => {
      const tr = document.createElement('tr');
      const isChecked = selectedOperarios.has(o.usucod);
      
      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="op-checkbox" data-code="${o.usucod}" ${isChecked ? 'checked' : ''} />
        </td>
        <td>${o.usucod}</td>
        <td>${o.usunom}</td>
        <td><span class="badge" style="background:var(--surface-100); color:var(--text-700);">${o.cargo}</span></td>
      `;
      modalOpTbody.appendChild(tr);
    });
  }

  function filterOperariosTable() {
    renderOperariosModalList();
  }

  function addSelectedOperarios() {
    const checkboxes = modalOpTbody.querySelectorAll('.op-checkbox');
    
    checkboxes.forEach(cb => {
      const code = cb.dataset.code;
      const opObj = operariosList.find(o => o.usucod === code);
      
      if (cb.checked) {
        if (!selectedOperarios.has(code)) {
          selectedOperarios.set(code, {
            usucod: opObj.usucod,
            usunom: opObj.usunom,
            cantidad: 1, // Default quantity
            vu: 0 // Will be recalculated
          });
        }
      } else {
        selectedOperarios.delete(code);
      }
    });

    closeOperarioModal();
    renderSelectedOperarios();
    recalculateWorkerValues();
  }

  function renderSelectedOperarios() {
    operariosTbody.innerHTML = '';

    if (selectedOperarios.size === 0) {
      operariosTbody.innerHTML = '<tr class="row-empty"><td colspan="5">Ningún operario seleccionado. Utilice el botón "AGREGAR" de arriba.</td></tr>';
      return;
    }

    selectedOperarios.forEach(op => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${op.usucod}</strong></td>
        <td>${op.usunom}</td>
        <td style="text-align: center;">
          <input type="number" class="input op-qty-input" data-code="${op.usucod}" min="1" value="${op.cantidad}" style="text-align: center; padding: 6px; border-radius: 8px;" />
        </td>
        <td style="text-align: center;">
          <input type="number" class="input op-vu-input" data-code="${op.usucod}" min="0" step="0.01" value="${op.vu.toFixed(2)}" style="text-align: center; padding: 6px; border-radius: 8px;" />
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-danger btn-remove-op" data-code="${op.usucod}" style="padding: var(--s1) var(--s2); font-size: 0.8rem;">Quitar</button>
        </td>
      `;

      // Listeners for Quantity and VU manual entries
      const qtyInput = tr.querySelector('.op-qty-input');
      qtyInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value || 0, 10);
        op.cantidad = val;
        recalculateWorkerValues();
      });

      const vuInput = tr.querySelector('.op-vu-input');
      vuInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value || 0);
        op.vu = val;
      });

      // Remove worker
      tr.querySelector('.btn-remove-op').addEventListener('click', () => {
        selectedOperarios.delete(op.usucod);
        renderSelectedOperarios();
        recalculateWorkerValues();
      });

      operariosTbody.appendChild(tr);
    });

    // Check case to toggle VU visibility/editability in table
    const config = locationsConfig[selectUbicacion.value];
    if (config) {
      const isJornal = config.tiptra === 'J';
      const vuInputs = operariosTbody.querySelectorAll('.op-vu-input');
      vuInputs.forEach(inp => {
        if (isJornal) {
          inp.value = '';
          inp.disabled = true;
          inp.style.background = 'var(--surface-100)';
        } else {
          inp.disabled = false;
          inp.style.background = '#fff';
        }
      });
    }
  }

  /**
   * Recalculates unit values proportionally based on duplicate seams/quantities entered.
   * Note rule: "Si selecciono en Cantidad # una misma Costura, el VU debe dividirse entre la cantidad de Operarios que la contienen. El campo VU se puede Editar."
   */
  function recalculateWorkerValues() {
    const config = locationsConfig[selectUbicacion.value];
    if (!config) return;

    const isJornal = config.tiptra === 'J';
    if (isJornal) {
      selectedOperarios.forEach(op => {
        op.vu = 0;
      });
      updateVuFieldsInTable();
      return;
    }

    const totalVu = parseFloat(inputVuIngresar.value || config.valorUnitario || 0);

    // Count occurrences of quantity '#' values
    const qtyCounts = {};
    selectedOperarios.forEach(op => {
      const qty = op.cantidad;
      qtyCounts[qty] = (qtyCounts[qty] || 0) + 1;
    });

    // Recalculate VU
    selectedOperarios.forEach(op => {
      const qty = op.cantidad;
      const count = qtyCounts[qty] || 1;
      
      // VU is divided by the number of operarios sharing it
      op.vu = totalVu / count;
    });

    updateVuFieldsInTable();
  }

  function updateVuFieldsInTable() {
    selectedOperarios.forEach(op => {
      const input = operariosTbody.querySelector(`.op-vu-input[data-code="${op.usucod}"]`);
      if (input) {
        input.value = op.vu > 0 ? op.vu.toFixed(2) : '';
      }
    });
  }

  // --- Alert System ---

  function showAlert(message, type = 'info') {
    alertArea.textContent = message;
    alertArea.className = 'status-alert alert-' + type;
    alertArea.style.display = 'block';
  }

  function hideAlert() {
    alertArea.style.display = 'none';
  }

  // --- Submit & Reset Form ---

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    hideAlert();

    if (!activeOt) {
      showAlert('POR FAVOR SELECCIONE UNA ORDEN DE TRABAJO', 'error');
      return;
    }

    const ubicod = selectUbicacion.value;
    if (!ubicod) {
      showAlert('POR FAVOR SELECCIONE UNA UBICACIÓN', 'error');
      return;
    }

    const config = locationsConfig[ubicod];
    const tiptra = config.tiptra;
    const ubiuni = config.ubiuni;

    // Lote checks
    const loteVal = selectLote.value;
    if (selectLote.required && !loteVal) {
      showAlert('EL LOTE ES OBLIGATORIO PARA ESTA UBICACIÓN', 'error');
      return;
    }

    const cantidadIngresar = parseFloat(inputCantidadIngresar.value || 0);
    const vuIngresar = parseFloat(inputVuIngresar.value || 0);

    if (cantidadIngresar <= 0) {
      showAlert('LA CANTIDAD A INGRESAR DEBE SER MAYOR A CERO', 'error');
      return;
    }

    if (selectedOperarios.size === 0) {
      showAlert('DEBE ASIGNAR AL MENOS UN OPERARIO', 'error');
      return;
    }

    // Sum validation checks
    let sumQuantities = 0;
    let sumVus = 0;
    const workersList = [];

    let qtyValidationError = false;
    selectedOperarios.forEach(op => {
      if (op.cantidad <= 0) {
        qtyValidationError = true;
      }
      sumQuantities += op.cantidad;
      sumVus += op.vu;
      workersList.push({
        usucod: op.usucod,
        cantidad: op.cantidad,
        vu: op.vu
      });
    });

    if (qtyValidationError) {
      showAlert('LAS CANTIDADES (#) DE LOS OPERARIOS DEBEN SER MAYOR A CERO', 'error');
      return;
    }

    if (sumQuantities > cantidadIngresar) {
      showAlert(`LA SUMA DE CANTIDADES (#) DE OPERARIOS (${sumQuantities}) NO DEBE EXCEDER EL TOTAL DE LA CANTIDAD A INGRESAR (${cantidadIngresar})`, 'error');
      return;
    }

    if (tiptra !== 'J' && sumVus > vuIngresar) {
      showAlert(`LA SUMA DE VU DE OPERARIOS (${sumVus.toFixed(2)}) SUPERA EL VALOR UNITARIO CONFIGURADO (${vuIngresar.toFixed(2)})`, 'error');
      return;
    }

    // Call backend API REST
    showAlert('Guardando registro...', 'info');
    try {
      const payload = {
        otcod: activeOt,
        ubicod,
        lote: loteVal || null,
        cantidadIngresar,
        vuIngresar: tiptra === 'J' ? 0 : vuIngresar,
        workers: workersList
      };

      const res = await window.AppFetch('/api/produccion/registrar', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showAlert(res.message || 'EL REGISTRO FUE INGRESADO CORRECTAMENTE', 'success');
      
      // Clear form on success
      setTimeout(() => {
        handleCancel();
        hideAlert();
      }, 2500);

    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  function handleCancel() {
    activeOt = null;
    activeProduct = null;
    locationsConfig = {};
    selectedOperarios.clear();

    inputOt.value = '';
    selectUbicacion.value = '';
    selectUbicacion.disabled = true;
    selectLote.innerHTML = '<option value="">SELECCIONE LOTE</option>';
    selectLote.disabled = true;
    
    lblProcod.textContent = '---';
    lblPronom.textContent = '---';
    lblCanreq.textContent = '---';
    
    resetUbicacionFields();
    hideAlert();
  }

})();
