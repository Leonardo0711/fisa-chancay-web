// public/js/modules/produccion.js
(function() {
  'use strict';

  // State management
  let activeOt = null;
  let activeProduct = null;
  let currentOtDetails = null;
  let locationsConfig = {};
  let operariosList = [];
  let selectedOperarios = new Map(); // Key: usucod, Value: operario object
  let allLocations = [];
  let currentLotesData = [];
  let lotesCosturasMap = {};
  let currentJornalTotal = 0;
  let currentJornalSaldo = 0;

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
  
  const radioDestajo = document.getElementById('f-tiptra-destajo');
  const radioJornal = document.getElementById('f-tiptra-jornal');

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
    selectUbicacion.addEventListener('change', () => {
      handleUbicacionChange();
      saveFormDraft();
    });
  }

  if (selectLote) {
    selectLote.addEventListener('change', () => {
      handleLoteChange();
      saveFormDraft();
    });
  }

  if (inputCantidadIngresar) {
    inputCantidadIngresar.addEventListener('input', () => {
      const config = getCurrentLocationConfig();
      const isJornal = (radioJornal && radioJornal.checked) || (config && config.tiptra === 'J');
      if (isJornal) {
        const val = parseFloat(inputCantidadIngresar.value || 0);
        const maxPermitido = currentJornalSaldo > 0 ? currentJornalSaldo : currentJornalTotal;
        if (maxPermitido > 0 && val > maxPermitido) {
          showAlert(`LA CANTIDAD A INGRESAR (${val}) NO PUEDE EXCEDER EL SALDO PENDIENTE (${maxPermitido})`, 'error');
          if (btnAccept) btnAccept.disabled = true;
          return;
        } else {
          hideAlert();
          if (btnAccept) btnAccept.disabled = false;
        }
        if (selectedOperarios.size > 0 && !isNaN(val) && val >= 0) {
          const perOp = parseFloat((val / selectedOperarios.size).toFixed(2));
          selectedOperarios.forEach(op => {
            op.vu = perOp;
            op.cantidad = 1;
          });
          renderSelectedOperarios();
        }
      }
      recalculateWorkerValues();
      saveFormDraft();
    });
  }

  if (inputVuIngresar) {
    inputVuIngresar.addEventListener('input', () => {
      const config = getCurrentLocationConfig();
      const isJornal = (radioJornal && radioJornal.checked) || (config && config.tiptra === 'J');
      if (isJornal && selectedOperarios.size > 0) {
        const vuVal = parseFloat(inputVuIngresar.value || 0);
        if (!isNaN(vuVal) && vuVal >= 0) {
          selectedOperarios.forEach(op => {
            op.vu = vuVal;
          });
        }
      }
      recalculateWorkerValues();
      renderSelectedOperarios();
      saveFormDraft();
    });
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

  if (radioDestajo) {
    radioDestajo.addEventListener('change', () => {
      filterLocationsByTipoTrabajo();
      saveFormDraft();
    });
  }
  if (radioJornal) {
    radioJornal.addEventListener('change', () => {
      filterLocationsByTipoTrabajo();
      saveFormDraft();
    });
  }

  // Initialize
  initPage();

  async function initPage() {
    await loadUbicaciones();
    // Preload operarios list
    try {
      operariosList = await window.AppFetch('/api/produccion/operarios');
    } catch (e) {
      console.warn('Error precargando operarios:', e.message);
    }
    // Restaurar borrador ante actualización (F5)
    await restoreFormDraft();
  }

  // --- Helper Functions ---

  function getCurrentLocationConfig() {
    const ubicod = selectUbicacion ? selectUbicacion.value : null;
    if (!ubicod) return null;
    const locMaster = allLocations.find(u => u.ubicod === ubicod);
    return (locationsConfig && locationsConfig[ubicod]) || (locMaster ? {
      ubicod: locMaster.ubicod,
      ubinom: locMaster.ubinom,
      tiptra: locMaster.tiptra,
      ubiuni: !!locMaster.ubiuni,
      cantidad: null,
      unidadCant: null,
      valorUnitario: null,
      unidadVu: null,
      tarifa: null
    } : null);
  }

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

  function getSelectedLotPrevCosturas() {
    const lotVal = selectLote ? String(selectLote.value || '').trim() : '';
    if (lotVal && lotesCosturasMap[lotVal] !== undefined) {
      return lotesCosturasMap[lotVal];
    }
    if (lotVal && Array.isArray(currentLotesData)) {
      const match = currentLotesData.find(l => String(l.lotcod || '').trim() === lotVal);
      if (match && match.costurasRegistradas !== undefined) {
        return parseInt(match.costurasRegistradas, 10) || 0;
      }
    }
    if (selectLote && lotVal) {
      const opt = selectLote.querySelector(`option[value="${lotVal}"]`);
      if (opt && opt.dataset && opt.dataset.prevCosturas) {
        return parseInt(opt.dataset.prevCosturas, 10) || 0;
      }
    }
    if (selectLote && selectLote.selectedIndex >= 0) {
      const opt = selectLote.options[selectLote.selectedIndex];
      if (opt && opt.dataset && opt.dataset.prevCosturas) {
        return parseInt(opt.dataset.prevCosturas, 10) || 0;
      }
    }
    return 0;
  }

  async function loadLotes(otcod, ubicod) {
    try {
      const targetUbicod = ubicod || (selectUbicacion ? selectUbicacion.value : null);
      let url = `/api/produccion/ots/${encodeURIComponent(otcod)}/lotes`;
      if (targetUbicod) {
        url += `?ubicod=${encodeURIComponent(targetUbicod)}`;
      }
      const lotes = await window.AppFetch(url);
      currentLotesData = Array.isArray(lotes) ? lotes : [];
      lotesCosturasMap = {};
      if (Array.isArray(lotes)) {
        lotes.forEach(l => {
          const k = String(l.lotcod || '').trim();
          if (k) lotesCosturasMap[k] = parseInt(l.costurasRegistradas || 0, 10);
        });
      }

      selectLote.innerHTML = '<option value="">SELECCIONE LOTE</option>';
      if (Array.isArray(lotes) && lotes.length > 0) {
        selectLote.disabled = false;
        lotes.forEach((l, idx) => {
          const opt = document.createElement('option');
          opt.value = l.lotcod;
          const displayFraction = l.avance || `${idx + 1}/${lotes.length}`;
          opt.textContent = `${l.lotcod} - ${displayFraction}`;
          opt.dataset.avance = displayFraction;
          opt.dataset.prevCosturas = String(l.costurasRegistradas || 0);
          selectLote.appendChild(opt);
        });
      } else {
        selectLote.innerHTML = '<option value="">NO HAY LOTES DISPONIBLES</option>';
        selectLote.disabled = true;
      }
      if (selectLote && selectLote._searchableInstance && typeof selectLote._searchableInstance.sync === 'function') {
        selectLote._searchableInstance.sync();
      }
      return lotes;
    } catch (err) {
      console.error('Error al cargar lotes:', err.message);
      return [];
    }
  }

  async function loadProductConfig(procod) {
    try {
      locationsConfig = await window.AppFetch(`/api/produccion/ubicaciones/producto/${encodeURIComponent(procod)}`);
    } catch (err) {
      console.error('Error al cargar configuraciones de ubicación:', err.message);
      locationsConfig = {};
    }
    filterLocationsByTipoTrabajo();
  }

  function handleLoteChange() {
    if (!selectLote) return;
    const selectedOpt = selectLote.options[selectLote.selectedIndex];
    if (selectedOpt && selectedOpt.value) {
      lblLoteProgress.textContent = selectedOpt.dataset.avance || '---';

      const prevCosturas = getSelectedLotPrevCosturas();
      const config = getCurrentLocationConfig();
      if (config && config.cantidad !== null && typeof config.cantidad !== 'undefined') {
        const totalConfig = parseInt(config.cantidad, 10) || 0;
        const remaining = Math.max(totalConfig - prevCosturas, 1);
        if (!inputCantidadIngresar.value || inputCantidadIngresar.dataset.autoFilled === '1') {
          inputCantidadIngresar.value = remaining;
          inputCantidadIngresar.dataset.autoFilled = '1';
        }
      }
    } else {
      lblLoteProgress.textContent = '---';
    }
    recalculateWorkerValues();
    renderSelectedOperarios();
  }

  async function selectOt(ot) {
    activeOt = ot.otcod;
    activeProduct = ot.procod;
    currentOtDetails = ot;
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
    modalSelectedCodes = [];
    renderSelectedOperarios();
    btnAgregarOperario.disabled = true;

    // Load Lotes for the selected OT
    await loadLotes(ot.otcod);

    // Load Location configurations for the selected Product
    await loadProductConfig(ot.procod);

    saveFormDraft();
  }

  async function loadUbicaciones() {
    try {
      allLocations = await window.AppFetch('/api/produccion/ubicaciones');
      filterLocationsByTipoTrabajo();
    } catch (err) {
      console.error('Error al cargar ubicaciones:', err.message);
    }
  }

  function filterLocationsByTipoTrabajo(preservedUbicod = null) {
    if (!selectUbicacion) return;
    const isDestajoSelected = radioDestajo && radioDestajo.checked;
    const targetTiptra = isDestajoSelected ? 'D' : 'J';

    if (!activeOt) {
      selectUbicacion.innerHTML = '<option value="">PRIMERO SELECCIONE UNA OT</option>';
      selectUbicacion.disabled = true;
      resetUbicacionFields();
      return;
    }

    selectUbicacion.disabled = false;
    selectUbicacion.innerHTML = '<option value="">SELECCIONE UBICACIÓN</option>';

    const configKeys = locationsConfig ? Object.keys(locationsConfig) : [];
    const hasProductConfig = configKeys.length > 0;

    let availableLocations = [];

    if (hasProductConfig) {
      // Filtrar ÚNICAMENTE por ubicaciones configuradas para este producto en PAR_UBICACION_PRODUCTO
      availableLocations = allLocations.filter(u => {
        if (u.tiptra !== targetTiptra) return false;
        return locationsConfig[u.ubicod] !== undefined;
      });
    } else {
      // Si el producto no tiene configuración específica en PAR_UBICACION_PRODUCTO, mostrar las del tipo de trabajo
      availableLocations = allLocations.filter(u => u.tiptra === targetTiptra);
    }

    if (availableLocations.length === 0) {
      selectUbicacion.innerHTML = '<option value="">NO HAY UBICACIONES DISPONIBLES PARA ESTE PRODUCTO</option>';
      resetUbicacionFields();
      return;
    }

    availableLocations.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.ubicod;
      opt.textContent = `${u.ubicod} - ${u.ubinom}`;
      opt.dataset.tiptra = u.tiptra;
      opt.dataset.ubiuni = u.ubiuni ? '1' : '0';
      selectUbicacion.appendChild(opt);
    });

    // Si se preserva una ubicación válida, mantenerla; de lo contrario resetear
    if (preservedUbicod && availableLocations.some(u => u.ubicod === preservedUbicod)) {
      selectUbicacion.value = preservedUbicod;
    } else {
      selectUbicacion.value = '';
      resetUbicacionFields();
    }
  }

  function handleUbicacionChange() {
    const ubicod = selectUbicacion.value;
    if (!ubicod) {
      resetUbicacionFields();
      return;
    }

    const config = getCurrentLocationConfig();
    if (!config) {
      resetUbicacionFields();
      return;
    }

    btnAgregarOperario.disabled = false;

    // Obtener tipo de trabajo y si es universal
    const tiptra = config.tiptra || 'D';
    const ubiuni = typeof config.ubiuni === 'boolean' ? config.ubiuni : false;

    // Ajustar radio button según tipo de trabajo
    if (tiptra === 'D') {
      document.getElementById('f-tiptra-destajo').checked = true;
      document.getElementById('f-tiptra-jornal').checked = false;
    } else {
      document.getElementById('f-tiptra-destajo').checked = false;
      document.getElementById('f-tiptra-jornal').checked = true;
    }

    // Mostrar siempre la etiqueta correcta: UNIVERSAL o NO UNIVERSAL
    lblUbiuni.value = ubiuni ? 'UNIVERSAL' : 'NO UNIVERSAL';
    
    const uCant = config.unidadCant || '---';
    const uVu = config.unidadVu || '---';
    lblUnidadLbl.textContent = `${uCant} / ${uVu}`;

    const cantVal = config.cantidad !== null && typeof config.cantidad !== 'undefined' ? config.cantidad : '---';
    const vuVal = config.valorUnitario !== null && typeof config.valorUnitario !== 'undefined' ? Number(config.valorUnitario).toFixed(2) : '---';
    lblValores.value = `${cantVal} / ${vuVal}`;

    // Lógica según caso de trabajo
    if (tiptra === 'D' && !ubiuni) {
      // CASE 1: Destajo y No Universal
      inputCantidadIngresar.value = config.cantidad !== null && typeof config.cantidad !== 'undefined' ? config.cantidad : '';
      inputCantidadIngresar.readOnly = false;
      inputCantidadIngresar.dataset.autoFilled = '1';
      inputCantidadIngresar.style.background = '#fff';
      badgCant.textContent = uCant;

      inputVuIngresar.value = config.valorUnitario !== null && typeof config.valorUnitario !== 'undefined' ? config.valorUnitario : '';
      inputVuIngresar.readOnly = config.valorUnitario !== null && typeof config.valorUnitario !== 'undefined';
      inputVuIngresar.style.background = inputVuIngresar.readOnly ? 'var(--surface-100)' : '#fff';
      badgVu.textContent = uVu;

      document.getElementById('vuFieldGroup').style.display = 'block';
      document.getElementById('loteFieldGroup').style.display = 'block';
      selectLote.required = true;
    } 
    else if (tiptra === 'D' && ubiuni) {
      // CASE 2: Destajo y Universal
      inputCantidadIngresar.value = '';
      inputCantidadIngresar.readOnly = false;
      inputCantidadIngresar.style.background = '#fff';
      badgCant.textContent = '---';

      inputVuIngresar.value = config.valorUnitario !== null && typeof config.valorUnitario !== 'undefined' ? config.valorUnitario : '';
      inputVuIngresar.readOnly = false;
      inputVuIngresar.style.background = '#fff';
      badgVu.textContent = uVu;

      document.getElementById('vuFieldGroup').style.display = 'block';
      document.getElementById('loteFieldGroup').style.display = 'none'; // oculto para Destajo Universal
      selectLote.required = false;
    }
    else {
      // CASE 3: Jornal
      inputCantidadIngresar.value = '';
      inputCantidadIngresar.readOnly = false;
      inputCantidadIngresar.style.background = '#fff';
      badgCant.textContent = uCant;

      inputVuIngresar.value = (config.valorUnitario !== null && typeof config.valorUnitario !== 'undefined') ? config.valorUnitario : '';
      inputVuIngresar.readOnly = false;
      inputVuIngresar.style.background = '#fff';
      badgVu.textContent = uVu;

      document.getElementById('vuFieldGroup').style.display = 'block';
      document.getElementById('loteFieldGroup').style.display = 'none'; // oculto para Jornal
      selectLote.required = false;

      // Consultar saldo pendiente acumulado en FTALLER para esta OT y ubicación de Jornal
      if (activeOt) {
        window.AppFetch(`/api/produccion/ots/${encodeURIComponent(activeOt)}/saldo-jornal?ubicod=${encodeURIComponent(ubicod)}&procod=${encodeURIComponent(activeProduct || '')}`)
          .then(saldoData => {
            const totalConfig = Number(saldoData.totalConfigurada || config.cantidad || 0);
            const reg = Number(saldoData.cantidadRegistrada || 0);
            const saldo = saldoData.saldoPendiente > 0 ? saldoData.saldoPendiente : (totalConfig > 0 ? Math.max(0, totalConfig - reg) : 0);
            
            currentJornalTotal = totalConfig;
            currentJornalSaldo = saldo;
            
            if (saldo > 0) {
              inputCantidadIngresar.value = saldo;
              badgCant.textContent = `Pend: ${saldo}/${totalConfig}`;
              lblValores.value = `${totalConfig} (Pend: ${saldo}) / ${config.valorUnitario !== null && config.valorUnitario !== undefined ? Number(config.valorUnitario).toFixed(2) : '---'}`;
            } else if (totalConfig > 0) {
              inputCantidadIngresar.value = totalConfig;
              badgCant.textContent = `${totalConfig} ${uCant}`;
            }
            recalculateWorkerValues();
            renderSelectedOperarios();
            saveFormDraft();
          })
          .catch(err => {
            console.warn('Error obteniendo saldo Jornal:', err.message);
          });
      }
    }

    // Recalcular valores de operarios
    recalculateWorkerValues();

    // Recargar lotes disponibles para esta ubicación específica
    if (activeOt && selectLote) {
      const currentLote = selectLote.value;
      loadLotes(activeOt, ubicod).then(() => {
        if (currentLote && selectLote.querySelector(`option[value="${currentLote}"]`)) {
          selectLote.value = currentLote;
        } else if (selectLote.options.length > 1) {
          selectLote.selectedIndex = 1;
        } else {
          selectLote.value = '';
        }
        if (selectLote && selectLote._searchableInstance && typeof selectLote._searchableInstance.sync === 'function') {
          selectLote._searchableInstance.sync();
        }
        handleLoteChange();
        saveFormDraft();
      });
    }
  }

  function resetUbicacionFields() {
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
    badgCant.style.color = '';
    badgCant.style.fontWeight = '';
    badgVu.textContent = '---';
    currentJornalTotal = 0;
    currentJornalSaldo = 0;
    if (btnAccept) btnAccept.disabled = false;
    
    document.getElementById('vuFieldGroup').style.display = 'block';
    document.getElementById('loteFieldGroup').style.display = 'block';
    btnAgregarOperario.disabled = true;

    selectedOperarios.clear();
    renderSelectedOperarios();
  }

  // --- Operarios Modal ---

  let modalSelectedCodes = []; // Mantiene el orden exacto en el que fueron seleccionados

  async function openOperarioModal() {
    modalOperario.classList.add('active');
    modalOpSearch.value = '';
    
    // Inicializar selección del modal con los operarios ya asignados previamente (respetando su orden)
    modalSelectedCodes = Array.from(selectedOperarios.keys());
    updateModalOpSelectedCount();

    const isDestajo = radioDestajo && radioDestajo.checked;
    const targetTiptra = isDestajo ? 'D' : 'J';
    const titleEl = document.getElementById('modalOperarioTitle');
    if (titleEl) {
      titleEl.textContent = isDestajo ? 'Asignar Operarios (Destajo)' : 'Asignar Operarios (Jornal)';
    }

    modalOpTbody.innerHTML = '<tr class="row-empty"><td colspan="5">Cargando operarios...</td></tr>';
    
    try {
      const data = await window.AppFetch(`/api/produccion/operarios?tipo=${encodeURIComponent(targetTiptra)}`);
      operariosList = data || [];
      renderOperariosModalList();
      setTimeout(() => {
        if (modalOpSearch) modalOpSearch.focus();
      }, 50);
    } catch (err) {
      modalOpTbody.innerHTML = `<tr class="row-empty"><td colspan="5" style="color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function closeOperarioModal() {
    modalOperario.classList.remove('active');
  }

  function updateModalOpSelectedCount() {
    const countBadge = document.getElementById('lblModalOpSelectedCount');
    if (countBadge) {
      const count = modalSelectedCodes.length;
      countBadge.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
    }
  }

  function renderOperariosModalList() {
    modalOpTbody.innerHTML = '';
    const q = modalOpSearch ? modalOpSearch.value.trim().toLowerCase() : '';

    // 1. Grupo de seleccionados: en el orden exacto en que fueron elegidos (modalSelectedCodes)
    // Siempre visibles arriba sin importar lo que se busque en el filtro
    const selectedList = modalSelectedCodes
      .map(code => operariosList.find(o => o.usucod === code))
      .filter(Boolean);

    // 2. Grupo de disponibles (no seleccionados): filtrados por el término de búsqueda
    const availableList = operariosList.filter(o => {
      if (modalSelectedCodes.includes(o.usucod)) return false;
      if (!q) return true;
      return (
        (o.usucod && o.usucod.toLowerCase().includes(q)) || 
        (o.usunom && o.usunom.toLowerCase().includes(q)) ||
        (o.cargo && o.cargo.toLowerCase().includes(q))
      );
    });

    updateModalOpSelectedCount();

    if (selectedList.length === 0 && availableList.length === 0) {
      modalOpTbody.innerHTML = '<tr class="row-empty"><td colspan="5">No se encontraron operarios.</td></tr>';
      return;
    }

    // --- SECCIÓN 1: SELECCIONADOS (ARRIBA, EN SU ORDEN RESPECTIVO) ---
    if (selectedList.length > 0) {
      const headerTr = document.createElement('tr');
      headerTr.style.background = '#e0f2fe';
      headerTr.style.borderBottom = '1.5px solid var(--brand-300, #93c5fd)';
      headerTr.innerHTML = `
        <td colspan="5" style="padding: 4px 8px; font-weight: 800; font-size: 0.72rem; color: var(--brand-900); text-transform: uppercase; letter-spacing: 0.4px;">
          ✓ OPERARIOS SELECCIONADOS (${selectedList.length}) &mdash; ORDEN DE ASIGNACIÓN
        </td>
      `;
      modalOpTbody.appendChild(headerTr);

      selectedList.forEach((o, index) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.style.background = '#f0fdf4';
        tr.style.borderBottom = '1px solid #bbf7d0';
        tr.style.height = '28px';

        tr.innerHTML = `
          <td style="text-align: center; vertical-align: middle; padding: 2px 4px;">
            <input type="checkbox" class="op-checkbox" data-code="${o.usucod}" checked style="cursor: pointer; width: 15px; height: 15px; accent-color: var(--brand-700); margin: 0 auto; display: block;" />
          </td>
          <td style="text-align: center; vertical-align: middle; padding: 2px 4px;">
            <span class="badge" style="background: var(--brand-700); color: #fff; font-weight: 800; border-radius: 4px; padding: 1px 5px; font-size: 0.72rem; line-height: 1;">#${index + 1}</span>
          </td>
          <td style="font-weight: 800; color: var(--brand-900); font-size: 0.78rem; vertical-align: middle; padding: 2px 6px;">${o.usucod}</td>
          <td style="font-weight: 700; color: var(--text-900); font-size: 0.8rem; vertical-align: middle; padding: 2px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.usunom}">${o.usunom}</td>
          <td style="vertical-align: middle; padding: 2px 6px;"><span class="badge" style="background: var(--surface-100); color: var(--text-700); font-weight: 600; font-size: 0.72rem; padding: 1px 6px; line-height: 1.2;">${o.cargo || '---'}</span></td>
        `;

        tr.addEventListener('click', (e) => {
          if (e.target.tagName !== 'INPUT') {
            toggleOperarioSelection(o.usucod);
          }
        });

        const cb = tr.querySelector('.op-checkbox');
        cb.addEventListener('change', () => {
          toggleOperarioSelection(o.usucod);
        });

        modalOpTbody.appendChild(tr);
      });
    }

    // --- SECCIÓN 2: DISPONIBLES (ABAJO) ---
    if (availableList.length > 0) {
      if (selectedList.length > 0) {
        const availHeaderTr = document.createElement('tr');
        availHeaderTr.style.background = 'var(--surface-100, #f8fafc)';
        availHeaderTr.style.borderBottom = '1px solid var(--border-200)';
        availHeaderTr.innerHTML = `
          <td colspan="5" style="padding: 4px 8px; font-weight: 700; font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px;">
            OPERARIOS DISPONIBLES ${q ? `(FILTRADOS POR "${q.toUpperCase()}")` : ''} (${availableList.length})
          </td>
        `;
        modalOpTbody.appendChild(availHeaderTr);
      }

      availableList.forEach(o => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.style.borderBottom = '1px solid var(--border-200)';
        tr.style.height = '28px';

        tr.innerHTML = `
          <td style="text-align: center; vertical-align: middle; padding: 2px 4px;">
            <input type="checkbox" class="op-checkbox" data-code="${o.usucod}" style="cursor: pointer; width: 15px; height: 15px; margin: 0 auto; display: block;" />
          </td>
          <td style="text-align: center; vertical-align: middle; color: var(--muted); font-size: 0.74rem; padding: 2px 4px;">-</td>
          <td style="font-weight: 700; color: var(--text-700); font-size: 0.78rem; vertical-align: middle; padding: 2px 6px;">${o.usucod}</td>
          <td style="font-weight: 600; color: var(--text-900); font-size: 0.8rem; vertical-align: middle; padding: 2px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.usunom}">${o.usunom}</td>
          <td style="vertical-align: middle; padding: 2px 6px;"><span class="badge" style="background: var(--surface-100); color: var(--text-700); font-size: 0.72rem; padding: 1px 6px; line-height: 1.2;">${o.cargo || '---'}</span></td>
        `;

        tr.addEventListener('click', (e) => {
          if (e.target.tagName !== 'INPUT') {
            toggleOperarioSelection(o.usucod);
          }
        });

        const cb = tr.querySelector('.op-checkbox');
        cb.addEventListener('change', () => {
          toggleOperarioSelection(o.usucod);
        });

        modalOpTbody.appendChild(tr);
      });
    } else if (selectedList.length > 0 && q) {
      const emptyAvail = document.createElement('tr');
      emptyAvail.innerHTML = `<td colspan="5" style="text-align: center; padding: 10px; color: var(--muted); font-size: 0.8rem; font-style: italic;">No se encontraron más operarios disponibles para "${q}".</td>`;
      modalOpTbody.appendChild(emptyAvail);
    }
  }

  function toggleOperarioSelection(code) {
    const idx = modalSelectedCodes.indexOf(code);
    if (idx >= 0) {
      modalSelectedCodes.splice(idx, 1);
    } else {
      modalSelectedCodes.push(code);
    }
    renderOperariosModalList();
  }

  function filterOperariosTable() {
    renderOperariosModalList();
  }

  function addSelectedOperarios() {
    const config = getCurrentLocationConfig();
    const isJornal = (radioJornal && radioJornal.checked) || (config && config.tiptra === 'J');

    if (isJornal) {
      const totalCant = parseFloat(inputCantidadIngresar ? inputCantidadIngresar.value : 0) || 0;
      const count = modalSelectedCodes.length;
      const cantPorOp = (count > 0 && totalCant > 0) ? parseFloat((totalCant / count).toFixed(2)) : 0;

      let baseVu = 0;
      const vuInputVal = inputVuIngresar ? inputVuIngresar.value.trim() : '';
      if (vuInputVal !== '') {
        baseVu = parseFloat(vuInputVal) || 0;
      } else if (config && config.valorUnitario !== null && config.valorUnitario !== undefined) {
        baseVu = parseFloat(config.valorUnitario) || 0;
      }

      const newSelected = new Map();
      modalSelectedCodes.forEach(code => {
        const opObj = operariosList.find(o => o.usucod === code);
        if (!opObj) return;

        const prev = selectedOperarios.get(code);
        newSelected.set(code, {
          usucod: opObj.usucod,
          usunom: opObj.usunom,
          costuraNum: 1,
          cantidad: 1,
          vu: prev ? (prev.vu || prev.cantidad) : cantPorOp
        });
      });

      selectedOperarios.clear();
      newSelected.forEach((val, key) => selectedOperarios.set(key, val));

      closeOperarioModal();
      renderSelectedOperarios();
      saveFormDraft();
      return;
    }

    // --- MODO DESTAJO (100% INTACTO) ---
    const prevCosturas = getSelectedLotPrevCosturas();
    const startCostura = prevCosturas + 1;
    const cantCosturas = parseInt(inputCantidadIngresar ? inputCantidadIngresar.value : 0, 10) || 0;
    const maxCostura = cantCosturas > 0 ? (startCostura + cantCosturas - 1) : (startCostura + modalSelectedCodes.length - 1);

    const newSelected = new Map();

    modalSelectedCodes.forEach((code, index) => {
      const opObj = operariosList.find(o => o.usucod === code);
      if (!opObj) return;

      // Asignación secuencial a partir de startCostura (#1 -> startCostura, #2 -> startCostura + 1, etc.)
      let assignedCostura = startCostura + index;
      if (cantCosturas > 0 && assignedCostura > maxCostura) {
        assignedCostura = maxCostura;
      }

      newSelected.set(code, {
        usucod: opObj.usucod,
        usunom: opObj.usunom,
        costuraNum: assignedCostura,
        cantidad: 1,
        vu: 0
      });
    });

    selectedOperarios.clear();
    newSelected.forEach((val, key) => selectedOperarios.set(key, val));

    closeOperarioModal();
    recalculateWorkerValues();
    renderSelectedOperarios();
    saveFormDraft();
  }

  function formatWorkerName(fullName) {
    if (!fullName) return '';
    const words = fullName.trim().split(/\s+/);
    if (words.length <= 2) {
      return `<div style="font-weight: 700; color: var(--text-900); font-size: 0.88rem; line-height: 1.2;">${fullName}</div>`;
    }
    // 2 palabras arriba (Apellidos) y el resto abajo (Nombres)
    const topWords = words.slice(0, 2).join(' ');
    const bottomWords = words.slice(2).join(' ');
    return `<div style="line-height: 1.25;"><span style="font-weight: 800; color: var(--brand-900); font-size: 0.88rem;">${topWords}</span><br><span style="font-size: 0.82rem; color: var(--text-700); font-weight: 600;">${bottomWords}</span></div>`;
  }

  let draggedWorkerCode = null;

  // Touch drag variables for tablet and mobile
  let touchActiveOp = null;
  let touchSourceRow = null;
  let touchGhostEl = null;
  let touchCurrentOverRow = null;
  let touchIsDragging = false;
  let touchHoldTimeout = null;

  function cleanupTouchDrag() {
    if (touchHoldTimeout) {
      clearTimeout(touchHoldTimeout);
      touchHoldTimeout = null;
    }
    if (touchCurrentOverRow) {
      touchCurrentOverRow.classList.remove('touch-over');
      touchCurrentOverRow = null;
    }
    if (touchSourceRow) {
      touchSourceRow.classList.remove('touch-dragging');
      touchSourceRow = null;
    }
    if (touchGhostEl) {
      touchGhostEl.remove();
      touchGhostEl = null;
    }
    touchActiveOp = null;
    touchIsDragging = false;
    window.removeEventListener('touchmove', onGlobalTouchMove);
    window.removeEventListener('touchend', onGlobalTouchEnd);
    window.removeEventListener('touchcancel', onGlobalTouchCancel);
  }

  function startTouchDrag(op, rowEl, clientX, clientY) {
    if (touchIsDragging) cleanupTouchDrag();
    touchActiveOp = op;
    touchSourceRow = rowEl;
    touchIsDragging = true;
    touchSourceRow.classList.add('touch-dragging');

    touchGhostEl = document.createElement('div');
    touchGhostEl.className = 'touch-drag-preview';
    const shortName = op.usunom ? op.usunom.split(' ').slice(0, 2).join(' ') : '';
    touchGhostEl.innerHTML = `<span style="font-size: 1.1rem; opacity: 0.9;">⋮⋮</span><span><strong>${op.usucod}</strong> &mdash; ${shortName}</span>`;
    touchGhostEl.style.left = `${clientX}px`;
    touchGhostEl.style.top = `${clientY}px`;
    document.body.appendChild(touchGhostEl);

    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (_) {}
    }

    window.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', onGlobalTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onGlobalTouchCancel, { passive: false });
  }

  function onGlobalTouchMove(e) {
    if (!touchIsDragging || !e.touches || e.touches.length === 0) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    if (touchGhostEl) {
      touchGhostEl.style.left = `${touch.clientX}px`;
      touchGhostEl.style.top = `${touch.clientY}px`;
    }

    const elBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = elBelow ? elBelow.closest('.op-drag-row, .row-costura-empty') : null;

    if (targetRow !== touchCurrentOverRow) {
      if (touchCurrentOverRow) {
        touchCurrentOverRow.classList.remove('touch-over');
      }
      touchCurrentOverRow = targetRow;
      if (touchCurrentOverRow) {
        touchCurrentOverRow.classList.add('touch-over');
      }
    }
  }

  function onGlobalTouchEnd(e) {
    if (!touchIsDragging) {
      cleanupTouchDrag();
      return;
    }

    let targetRow = touchCurrentOverRow;
    if (!targetRow && e.changedTouches && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const elBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      targetRow = elBelow ? elBelow.closest('.op-drag-row, .row-costura-empty') : null;
    }

    const opToMove = touchActiveOp;
    cleanupTouchDrag();

    if (targetRow && opToMove && selectedOperarios.has(opToMove.usucod)) {
      if (targetRow.classList.contains('row-costura-empty')) {
        const targetCostura = parseInt(targetRow.dataset.costura, 10);
        if (!isNaN(targetCostura) && opToMove.costuraNum !== targetCostura) {
          opToMove.costuraNum = targetCostura;
          recalculateWorkerValues();
          renderSelectedOperarios();
          saveFormDraft();
        }
      } else if (targetRow.classList.contains('op-drag-row')) {
        const targetCode = targetRow.dataset.code;
        const targetCostura = parseInt(targetRow.dataset.costura, 10);
        if (targetCode && targetCode !== opToMove.usucod && !isNaN(targetCostura)) {
          opToMove.costuraNum = targetCostura;
          recalculateWorkerValues();
          renderSelectedOperarios();
          saveFormDraft();
        }
      }
    }
  }

  function onGlobalTouchCancel() {
    cleanupTouchDrag();
  }

  function renderSelectedOperarios() {
    cleanupTouchDrag();
    const config = getCurrentLocationConfig();
    const isJornal = (radioJornal && radioJornal.checked) || (config && config.tiptra === 'J');

    if (isJornal) {
      renderJornalOperarios();
      return;
    }

    // Asegurar cabeceras de Destajo
    const operTable = document.getElementById('operariosTable');
    if (operTable) {
      const thead = operTable.querySelector('thead');
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th style="width: 85px; text-align: left; padding: 10px 8px;"># COSTURA</th>
            <th style="width: 80px; text-align: left; padding: 10px 6px;">CÓDIGO</th>
            <th style="min-width: 140px; text-align: left; padding: 10px 6px;">NOMBRE</th>
            <th style="width: 90px; text-align: center; padding: 10px 4px;">VU</th>
            <th style="width: 65px; text-align: center; padding: 10px 4px;">ACC.</th>
          </tr>
        `;
      }
    }
    operariosTbody.innerHTML = '';

    const prevCosturas = getSelectedLotPrevCosturas();
    const startCostura = prevCosturas + 1;
    const cantCosturas = parseInt(inputCantidadIngresar ? inputCantidadIngresar.value : 0, 10) || 0;

    if (selectedOperarios.size === 0 && cantCosturas === 0) {
      operariosTbody.innerHTML = '<tr class="row-empty"><td colspan="5">Ningún operario seleccionado. Utilice el botón "AGREGAR" de arriba.</td></tr>';
      return;
    }

    // Rango de costuras para esta tanda: desde startCostura hasta startCostura + cantCosturas - 1
    let minCostura = startCostura;
    let maxCostura = cantCosturas > 0 ? (startCostura + cantCosturas - 1) : startCostura;

    const costuraCounts = {};
    selectedOperarios.forEach(op => {
      const c = op.costuraNum || startCostura;
      costuraCounts[c] = (costuraCounts[c] || 0) + 1;
      if (c < minCostura) minCostura = c;
      if (c > maxCostura) maxCostura = c;
    });

    // Ordenar operarios por número de costura
    const sortedWorkers = Array.from(selectedOperarios.values()).sort((a, b) => {
      const ca = a.costuraNum || startCostura;
      const cb = b.costuraNum || startCostura;
      if (ca !== cb) return ca - cb;
      return 0;
    });

    // Renderizar por cada número de costura desde minCostura hasta maxCostura
    for (let c = minCostura; c <= maxCostura; c++) {
      const workersInC = sortedWorkers.filter(w => (w.costuraNum || startCostura) === c);

      if (workersInC.length === 0) {
        // Fila para costura vacía que actúa como destino (drop target) de arrastre
        const emptyTr = document.createElement('tr');
        emptyTr.className = 'row-costura-empty';
        emptyTr.dataset.costura = String(c);
        emptyTr.style.background = '#fffbeb';
        emptyTr.style.border = '1.5px dashed #f59e0b';
        emptyTr.innerHTML = `
          <td colspan="5" style="padding: 7px 12px; font-size: 0.82rem; color: #b45309; text-align: center; vertical-align: middle;">
            <strong>Costura #${c}:</strong> Sin operario asignado &mdash; <span style="color: #92400e;">arrastre un operario aquí o asígnelo con el selector</span>
          </td>
        `;

        emptyTr.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          emptyTr.style.background = '#fef3c7';
          emptyTr.style.outline = '2px dashed #d97706';
        });
        emptyTr.addEventListener('dragleave', () => {
          emptyTr.style.background = '#fffbeb';
          emptyTr.style.outline = 'none';
        });
        emptyTr.addEventListener('drop', (e) => {
          e.preventDefault();
          emptyTr.style.background = '#fffbeb';
          emptyTr.style.outline = 'none';
          const code = draggedWorkerCode || e.dataTransfer.getData('text/plain');
          if (code && selectedOperarios.has(code)) {
            const op = selectedOperarios.get(code);
            op.costuraNum = c;
            recalculateWorkerValues();
            renderSelectedOperarios();
            saveFormDraft();
          }
        });

        operariosTbody.appendChild(emptyTr);
        continue;
      }

      // Renderizar filas de los operarios de esta costura
      workersInC.forEach(op => {
        const tr = document.createElement('tr');
        tr.className = 'op-drag-row';
        tr.setAttribute('draggable', 'true');
        tr.dataset.code = op.usucod;
        tr.dataset.costura = String(op.costuraNum || c);

        const isShared = workersInC.length > 1;
        const formattedVu = op.vu > 0 ? (Number.isInteger(op.vu) ? op.vu : parseFloat(op.vu.toFixed(2))) : '';

        // Opciones del selector de costura (solo números minCostura..maxCostura)
        let optionsHtml = '';
        for (let num = minCostura; num <= maxCostura; num++) {
          optionsHtml += `<option value="${num}" ${num === c ? 'selected' : ''}>${num}</option>`;
        }

        tr.innerHTML = `
          <td style="vertical-align: middle; padding: 6px 8px; white-space: nowrap;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="drag-handle" title="Mantenga presionado para arrastrar y agrupar en otra costura">⋮⋮</span>
              <select class="input op-costura-select" data-code="${op.usucod}" style="width: 58px; height: 32px; padding: 2px 4px; font-weight: 800; font-size: 0.88rem; text-align: center; border-radius: 8px; display: inline-block; vertical-align: middle; background: ${isShared ? '#fef3c7' : '#f0fdf4'}; border-color: ${isShared ? '#f59e0b' : '#22c55e'}; color: ${isShared ? '#92400e' : '#15803d'}; cursor: pointer;">
                ${optionsHtml}
              </select>
              ${isShared ? `<span class="badge" style="background: #fef3c7; color: #b45309; font-size: 0.7rem; font-weight: 800; padding: 2px 4px; border-radius: 4px;" title="Costura compartida entre ${workersInC.length} operarios">½</span>` : ''}
            </div>
          </td>
          <td style="font-weight: 800; color: var(--brand-900); font-size: 0.85rem; padding: 8px 6px; vertical-align: middle;">${op.usucod}</td>
          <td style="padding: 8px 6px; white-space: normal; vertical-align: middle; min-width: 140px;">${formatWorkerName(op.usunom)}</td>
          <td style="text-align: center; padding: 6px 4px; vertical-align: middle;">
            <input type="number" class="input op-vu-input" data-code="${op.usucod}" min="0" step="0.01" value="${formattedVu}" style="width: 76px; height: 34px; text-align: center; padding: 4px 6px; font-weight: 800; font-size: 0.95rem; color: var(--brand-900); border-radius: 8px; border: 1.5px solid var(--border-300); display: inline-block;" />
          </td>
          <td style="text-align: center; padding: 6px 4px; vertical-align: middle;">
            <button type="button" class="btn btn-danger btn-remove-op" data-code="${op.usucod}" style="padding: 5px 9px; font-size: 0.78rem; border-radius: 8px;">Quitar</button>
          </td>
        `;

        // Selector listener para mover de costura
        const costuraSel = tr.querySelector('.op-costura-select');
        costuraSel.addEventListener('change', (e) => {
          op.costuraNum = parseInt(e.target.value, 10);
          recalculateWorkerValues();
          renderSelectedOperarios();
          saveFormDraft();
        });

        // VU manual entry listener
        const vuInput = tr.querySelector('.op-vu-input');
        vuInput.addEventListener('input', (e) => {
          op.vu = parseFloat(e.target.value || 0);
          saveFormDraft();
        });

        // Quitar listener
        tr.querySelector('.btn-remove-op').addEventListener('click', () => {
          selectedOperarios.delete(op.usucod);
          modalSelectedCodes = modalSelectedCodes.filter(code => code !== op.usucod);
          recalculateWorkerValues();
          renderSelectedOperarios();
          saveFormDraft();
        });

        // Drag and drop listeners on row (Desktop Mouse)
        tr.addEventListener('dragstart', (e) => {
          draggedWorkerCode = op.usucod;
          e.dataTransfer.setData('text/plain', op.usucod);
          e.dataTransfer.effectAllowed = 'move';
          tr.classList.add('dragging');
        });

        tr.addEventListener('dragend', () => {
          draggedWorkerCode = null;
          tr.classList.remove('dragging');
          operariosTbody.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        tr.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          tr.classList.add('drag-over');
        });

        tr.addEventListener('dragleave', () => {
          tr.classList.remove('drag-over');
        });

        tr.addEventListener('drop', (e) => {
          e.preventDefault();
          tr.classList.remove('drag-over');
          const sourceCode = draggedWorkerCode || e.dataTransfer.getData('text/plain');
          if (sourceCode && sourceCode !== op.usucod && selectedOperarios.has(sourceCode)) {
            const sourceOp = selectedOperarios.get(sourceCode);
            sourceOp.costuraNum = op.costuraNum || c;
            recalculateWorkerValues();
            renderSelectedOperarios();
            saveFormDraft();
          }
        });

        // Touch Drag & Drop support (Mobile y Tablet: Touch en Handle o Long Press en fila)
        const handle = tr.querySelector('.drag-handle');
        if (handle) {
          handle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (e.touches && e.touches.length === 1) {
              const touch = e.touches[0];
              startTouchDrag(op, tr, touch.clientX, touch.clientY);
            }
          }, { passive: false });
        }

        let rowTouchStartX = 0;
        let rowTouchStartY = 0;
        tr.addEventListener('touchstart', (e) => {
          if (e.target.closest('input, select, button, .drag-handle')) return;
          if (!e.touches || e.touches.length !== 1) return;

          const touch = e.touches[0];
          rowTouchStartX = touch.clientX;
          rowTouchStartY = touch.clientY;

          if (touchHoldTimeout) clearTimeout(touchHoldTimeout);
          touchHoldTimeout = setTimeout(() => {
            touchHoldTimeout = null;
            startTouchDrag(op, tr, rowTouchStartX, rowTouchStartY);
          }, 280);
        }, { passive: true });

        tr.addEventListener('touchmove', (e) => {
          if (touchHoldTimeout && e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            const dist = Math.hypot(touch.clientX - rowTouchStartX, touch.clientY - rowTouchStartY);
            if (dist > 8) {
              clearTimeout(touchHoldTimeout);
              touchHoldTimeout = null;
            }
          }
        }, { passive: true });

        tr.addEventListener('touchend', () => {
          if (touchHoldTimeout) {
            clearTimeout(touchHoldTimeout);
            touchHoldTimeout = null;
          }
        }, { passive: true });

        tr.addEventListener('touchcancel', () => {
          if (touchHoldTimeout) {
            clearTimeout(touchHoldTimeout);
            touchHoldTimeout = null;
          }
        }, { passive: true });

        operariosTbody.appendChild(tr);
      });
    }
  }

  function renderJornalOperarios() {
    operariosTbody.innerHTML = '';

    // Estructura de cabecera 100% UNIFORME a Destajo
    const operTable = document.getElementById('operariosTable');
    if (operTable) {
      const thead = operTable.querySelector('thead');
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th style="width: 85px; text-align: left; padding: 10px 8px;"># COSTURA</th>
            <th style="width: 80px; text-align: left; padding: 10px 6px;">CÓDIGO</th>
            <th style="min-width: 140px; text-align: left; padding: 10px 6px;">NOMBRE</th>
            <th style="width: 90px; text-align: center; padding: 10px 4px;">VU</th>
            <th style="width: 65px; text-align: center; padding: 10px 4px;">ACC.</th>
          </tr>
        `;
      }
    }

    if (selectedOperarios.size === 0) {
      operariosTbody.innerHTML = '<tr class="row-empty"><td colspan="5">Ningún operario seleccionado. Utilice el botón "AGREGAR" de arriba.</td></tr>';
      updateJornalSummary();
      return;
    }

    selectedOperarios.forEach(op => {
      const tr = document.createElement('tr');
      const formattedVu = op.vu > 0 ? (Number.isInteger(op.vu) ? op.vu : parseFloat(op.vu.toFixed(2))) : '';

      tr.innerHTML = `
        <td style="vertical-align: middle; padding: 6px 8px; white-space: nowrap;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="drag-handle" style="opacity: 0.5;">⋮⋮</span>
            <select class="input op-costura-select" disabled style="width: 58px; height: 32px; padding: 2px 4px; font-weight: 800; font-size: 0.88rem; text-align: center; border-radius: 8px; display: inline-block; vertical-align: middle; background: #f0fdf4; border-color: #22c55e; color: #15803d;">
              <option value="1" selected>1</option>
            </select>
          </div>
        </td>
        <td style="font-weight: 800; color: var(--brand-900); font-size: 0.85rem; padding: 8px 6px; vertical-align: middle;">
          ${op.usucod}
        </td>
        <td style="padding: 8px 6px; white-space: normal; vertical-align: middle; min-width: 140px;">
          ${formatWorkerName(op.usunom)}
        </td>
        <td style="text-align: center; padding: 6px 4px; vertical-align: middle;">
          <input type="number" class="input op-vu-input" data-code="${op.usucod}" min="0" step="any" value="${formattedVu}" style="width: 76px; height: 34px; text-align: center; padding: 4px 6px; font-weight: 800; font-size: 0.95rem; color: var(--brand-900); border-radius: 8px; border: 1.5px solid var(--border-300); display: inline-block;" />
        </td>
        <td style="text-align: center; padding: 6px 4px; vertical-align: middle;">
          <button type="button" class="btn btn-danger btn-remove-op" data-code="${op.usucod}" style="padding: 5px 9px; font-size: 0.78rem; border-radius: 8px;">Quitar</button>
        </td>
      `;

      // VU manual entry listener (en Jornal, el VU representa la cantidad)
      const vuInput = tr.querySelector('.op-vu-input');
      vuInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value || 0);
        op.vu = val;
        op.cantidad = 1;
        updateJornalSummary();
        saveFormDraft();
      });

      // Quitar listener
      tr.querySelector('.btn-remove-op').addEventListener('click', () => {
        selectedOperarios.delete(op.usucod);
        modalSelectedCodes = modalSelectedCodes.filter(c => c !== op.usucod);
        renderJornalOperarios();
        saveFormDraft();
      });

      operariosTbody.appendChild(tr);
    });

    updateJornalSummary();
  }

  function updateJornalSummary() {
    let sumVu = 0;
    selectedOperarios.forEach(op => {
      sumVu += Number(op.vu || 0);
    });
    if (inputCantidadIngresar && selectedOperarios.size > 0) {
      inputCantidadIngresar.value = Number.isInteger(sumVu) ? sumVu : parseFloat(sumVu.toFixed(2));
    }

    const maxPermitido = currentJornalSaldo > 0 ? currentJornalSaldo : currentJornalTotal;
    if (maxPermitido > 0) {
      if (sumVu > maxPermitido) {
        badgCant.textContent = `¡EXCEDE! ${sumVu} > ${maxPermitido}`;
        badgCant.style.color = '#dc2626';
        badgCant.style.fontWeight = '800';
        showAlert(`LA CANTIDAD ASIGNADA (${sumVu}) EXCEDE EL SALDO DISPONIBLE (${maxPermitido})`, 'error');
        if (btnAccept) btnAccept.disabled = true;
      } else {
        const restante = maxPermitido - sumVu;
        badgCant.textContent = `Pend: ${maxPermitido}/${currentJornalTotal} (Resta: ${restante})`;
        badgCant.style.color = '';
        badgCant.style.fontWeight = '';
        hideAlert();
        if (btnAccept) btnAccept.disabled = false;
      }
    } else {
      if (btnAccept) btnAccept.disabled = false;
    }
  }

  /**
   * Recalculates unit values proportionally per costura.
   * Regla FISA: El VU ingresado es por cada Costura individual.
   * Si 2 o más operarios están asignados a la misma costura, el VU de esa costura se divide equitativamente.
   */
  function recalculateWorkerValues() {
    const config = getCurrentLocationConfig();
    const isJornal = (radioJornal && radioJornal.checked) || (config && config.tiptra === 'J');

    if (isJornal) {
      return;
    }

    // VU de cada costura individual
    let headerVuRaw = inputVuIngresar ? inputVuIngresar.value.trim() : '';
    let vuPorCostura = 0;
    if (headerVuRaw !== '') {
      vuPorCostura = parseFloat(headerVuRaw) || 0;
    } else if (config && config.valorUnitario !== null && config.valorUnitario !== undefined) {
      vuPorCostura = parseFloat(config.valorUnitario) || 0;
    }

    if (selectedOperarios.size === 0) return;

    // Contar cuántos operarios tiene cada costura
    const costuraCounts = {};
    selectedOperarios.forEach(op => {
      const c = op.costuraNum || 1;
      costuraCounts[c] = (costuraCounts[c] || 0) + 1;
    });

    // Dividir el VU de la costura equitativamente entre sus operarios
    selectedOperarios.forEach(op => {
      const c = op.costuraNum || 1;
      const count = costuraCounts[c] || 1;
      op.cantidad = 1;
      op.vu = vuPorCostura > 0 ? (vuPorCostura / count) : 0;
    });

    updateVuFieldsInTable();
  }

  function updateVuFieldsInTable() {
    selectedOperarios.forEach(op => {
      const input = operariosTbody.querySelector(`.op-vu-input[data-code="${op.usucod}"]`);
      if (input) {
        if (op.vu > 0) {
          input.value = Number.isInteger(op.vu) ? op.vu : parseFloat(op.vu.toFixed(2));
        } else {
          input.value = '';
        }
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

  async function handleSubmit() {
    hideAlert();

    if (!activeOt) {
      showAlert('POR FAVOR SELECCIONE UNA ORDEN DE TRABAJO (OT)', 'error');
      return;
    }

    const config = getCurrentLocationConfig();
    const isDestajo = radioDestajo && radioDestajo.checked;
    const tiptra = isDestajo ? 'D' : 'J';

    const ubicod = selectUbicacion ? selectUbicacion.value : '';
    if (!ubicod) {
      showAlert('POR FAVOR SELECCIONE UNA UBICACIÓN', 'error');
      return;
    }

    // Lote checks
    const loteVal = selectLote.value;
    if (selectLote.required && !loteVal) {
      showAlert('EL LOTE ES OBLIGATORIO PARA ESTA UBICACIÓN', 'error');
      return;
    }

    const vuIngresar = parseFloat(inputVuIngresar.value || 0);

    if (selectedOperarios.size === 0) {
      showAlert('DEBE ASIGNAR AL MENOS UN OPERARIO', 'error');
      return;
    }

    let cantidadIngresar = 0;
    const workersList = [];

    if (!isDestajo) {
      // --- MODO JORNAL ---
      cantidadIngresar = Array.from(selectedOperarios.values()).reduce((sum, op) => sum + Number(op.vu !== undefined ? op.vu : (op.cantidad || 0)), 0);
      if (cantidadIngresar <= 0) {
        showAlert('LA CANTIDAD TOTAL ASIGNADA A LOS OPERARIOS DEBE SER MAYOR A 0', 'error');
        return;
      }
      const maxPermitido = currentJornalSaldo > 0 ? currentJornalSaldo : currentJornalTotal;
      if (maxPermitido > 0 && cantidadIngresar > maxPermitido) {
        showAlert(`NO SE PUEDE REGISTRAR: LA CANTIDAD INGRESADA (${cantidadIngresar}) EXCEDE EL SALDO PENDIENTE (${maxPermitido})`, 'error');
        return;
      }
      selectedOperarios.forEach(op => {
        workersList.push({
          usucod: op.usucod,
          costuraNum: 1,
          cantidad: 1,
          vu: Number(op.vu || 0),
          valor_unitario: Number(op.vu || 0)
        });
      });
    } else {
      // --- MODO DESTAJO (100% INTACTO) ---
      const prevCosturas = getSelectedLotPrevCosturas();
      const startCostura = prevCosturas + 1;

      // Obtener las costuras cubiertas por los operarios asignados
      const coveredCosturas = new Set();
      selectedOperarios.forEach(op => {
        if (op.costuraNum) coveredCosturas.add(op.costuraNum);
      });

      const sortedCovered = Array.from(coveredCosturas).sort((a, b) => a - b);
      const firstCovered = sortedCovered[0];
      const lastCovered = sortedCovered[sortedCovered.length - 1];

      // Validar que no hayan costuras intermedias vacías entre la primera y la última cubierta
      const missingIntermediate = [];
      for (let c = firstCovered; c <= lastCovered; c++) {
        if (!coveredCosturas.has(c)) {
          missingIntermediate.push(c);
        }
      }

      if (missingIntermediate.length > 0) {
        showAlert(`ATENCIÓN: LA(S) COSTURA(S) INTERMEDIA(S) #${missingIntermediate.join(', #')} NO TIENEN OPERARIOS ASIGNADOS. POR FAVOR ASIGNE O REUBIQUE OPERARIOS PARA COMPLETAR LA SERIE.`, 'error');
        return;
      }

      // Cantidad efectiva de costuras que se ingresan en este registro
      cantidadIngresar = coveredCosturas.size;

      selectedOperarios.forEach(op => {
        workersList.push({
          usucod: op.usucod,
          cantidad: 1,
          vu: op.vu,
          valor_unitario: op.vu,
          costuraNum: op.costuraNum || startCostura
        });
      });
    }

    // Call backend API REST
    showAlert('Guardando registro en base de datos...', 'info');
    try {
      const locMaster = allLocations.find(u => u.ubicod === ubicod);
      const unicod_cant = (config && config.unicod_cant) || (locMaster && locMaster.unicod) || '001';

      const payload = {
        otcod: activeOt,
        tiptra,
        ubicod,
        lote: loteVal || '',
        lotcod: loteVal || '',
        cantidadIngresar,
        unicod_cant,
        vuIngresar: isDestajo ? vuIngresar : (workersList.length > 0 ? workersList[0].vu : vuIngresar),
        workers: workersList
      };

      const res = await window.AppFetch('/api/produccion/registrar', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // =========================================================================
      // REQUERIMIENTO FISA: "luego de poner a los operarios y todo y darle ya a aceptar
      // no quiero que se limpie todo quiero que se quede todo excepto la lista de operarios"
      // =========================================================================
      selectedOperarios.clear();
      modalSelectedCodes = [];
      renderSelectedOperarios();
      recalculateWorkerValues();

      // Si es Jornal, refrescar el saldo pendiente disponible para la próxima tanda
      if (!isDestajo && activeOt && ubicod) {
        window.AppFetch(`/api/produccion/ots/${encodeURIComponent(activeOt)}/saldo-jornal?ubicod=${encodeURIComponent(ubicod)}&procod=${encodeURIComponent(activeProduct || '')}`)
          .then(saldoData => {
            const totalConfig = saldoData.totalConfigurada || (config ? config.cantidad : 0) || 0;
            const reg = saldoData.cantidadRegistrada || 0;
            const saldo = saldoData.saldoPendiente > 0 ? saldoData.saldoPendiente : (totalConfig > 0 ? Math.max(0, totalConfig - reg) : 0);
            inputCantidadIngresar.value = saldo;
            badgCant.textContent = `Pend: ${saldo}/${totalConfig}`;
            lblValores.value = `${totalConfig} (Pend: ${saldo}) / ${config && config.valorUnitario !== null && config.valorUnitario !== undefined ? Number(config.valorUnitario).toFixed(2) : '---'}`;
          })
          .catch(() => {});
      }

      // Recargar lista de lotes por si el lote producido ya no está pendiente
      if (activeOt) {
        const currentUbicod = selectUbicacion ? selectUbicacion.value : null;
        const currentLot = selectLote ? selectLote.value : null;
        await loadLotes(activeOt, currentUbicod);
        if (currentLot && selectLote.querySelector(`option[value="${currentLot}"]`)) {
          selectLote.value = currentLot;
        } else if (selectLote.options.length > 1) {
          selectLote.selectedIndex = 1;
        } else {
          selectLote.value = '';
        }
        if (selectLote && selectLote._searchableInstance && typeof selectLote._searchableInstance.sync === 'function') {
          selectLote._searchableInstance.sync();
        }
        handleLoteChange();
      }

      // Actualizar borrador guardado en localStorage (sin los operarios)
      saveFormDraft();

      // Mostrar mensaje solicitado
      showAlert('Grabado Correctamente', 'success');
      if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage('Grabado Correctamente', 'success');
      }
      
      // Ocultar mensaje después de 4 segundos
      setTimeout(() => {
        hideAlert();
      }, 4000);

    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  function handleCancel() {
    activeOt = null;
    activeProduct = null;
    currentOtDetails = null;
    locationsConfig = {};
    selectedOperarios.clear();
    modalSelectedCodes = [];

    inputOt.value = '';
    filterLocationsByTipoTrabajo();
    selectLote.innerHTML = '<option value="">SELECCIONE LOTE</option>';
    selectLote.disabled = true;
    lblLoteProgress.textContent = '---';
    
    lblProcod.textContent = '---';
    lblPronom.textContent = '---';
    lblCanreq.textContent = '---';
    
    resetUbicacionFields();
    hideAlert();
    clearFormDraft();
  }

  // --- PERSISTENCIA DE BORRADOR ANTE ACTUALIZACIÓN (F5) ---

  function saveFormDraft() {
    try {
      if (!activeOt && selectedOperarios.size === 0 && !inputOt.value.trim()) {
        clearFormDraft();
        return;
      }

      const draft = {
        activeOt,
        otInputVal: inputOt.value,
        activeProduct,
        currentOtDetails,
        tiptra: (radioJornal && radioJornal.checked) ? 'J' : 'D',
        ubicod: selectUbicacion ? selectUbicacion.value : '',
        lotcod: selectLote ? selectLote.value : '',
        cantidadIngresar: inputCantidadIngresar ? inputCantidadIngresar.value : '',
        vuIngresar: inputVuIngresar ? inputVuIngresar.value : '',
        workers: Array.from(selectedOperarios.values()),
        modalSelectedCodes: modalSelectedCodes || []
      };

      localStorage.setItem('fisa_chancay_produccion_draft', JSON.stringify(draft));
    } catch (err) {
      console.warn('Error guardando borrador:', err);
    }
  }

  function clearFormDraft() {
    try {
      localStorage.removeItem('fisa_chancay_produccion_draft');
    } catch (e) {}
  }

  async function restoreFormDraft() {
    try {
      const raw = localStorage.getItem('fisa_chancay_produccion_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || (!draft.activeOt && !draft.otInputVal)) return;

      // 1. Restaurar tipo de trabajo
      if (draft.tiptra === 'J' && radioJornal) {
        radioJornal.checked = true;
        if (radioDestajo) radioDestajo.checked = false;
      } else if (radioDestajo) {
        radioDestajo.checked = true;
        if (radioJornal) radioJornal.checked = false;
      }

      // 2. Restaurar Orden de Trabajo si existía
      const otToRestore = draft.activeOt || draft.otInputVal;
      if (otToRestore) {
        activeOt = otToRestore;
        inputOt.value = otToRestore;

        if (draft.currentOtDetails) {
          currentOtDetails = draft.currentOtDetails;
          activeProduct = currentOtDetails.procod;
          lblProcod.textContent = currentOtDetails.procod || '---';
          lblPronom.textContent = currentOtDetails.pronom || '---';
          lblCanreq.textContent = `${currentOtDetails.canreq} ${currentOtDetails.univen || ''}`;
        } else {
          try {
            const data = await window.AppFetch(`/api/produccion/ots?q=${encodeURIComponent(otToRestore)}`);
            if (Array.isArray(data) && data.length > 0) {
              const match = data.find(o => o.otcod.trim() === otToRestore.trim()) || data[0];
              currentOtDetails = match;
              activeProduct = match.procod;
              lblProcod.textContent = match.procod || '---';
              lblPronom.textContent = match.pronom || '---';
              lblCanreq.textContent = `${match.canreq} ${match.univen || ''}`;
            }
          } catch (e) {
            console.warn('Error recargando detalles de OT:', e);
          }
        }

        // Cargar lotes y configuraciones
        await loadLotes(otToRestore);
        if (activeProduct) {
          try {
            locationsConfig = await window.AppFetch(`/api/produccion/ubicaciones/producto/${encodeURIComponent(activeProduct)}`);
          } catch (e) {
            locationsConfig = {};
          }
        }

        // Filtrar ubicaciones preservando la ubicación que tenía seleccionada
        filterLocationsByTipoTrabajo(draft.ubicod);

        // 3. Restaurar Ubicación seleccionada
        if (draft.ubicod && selectUbicacion) {
          selectUbicacion.value = draft.ubicod;
          if (selectUbicacion && selectUbicacion._searchableInstance && typeof selectUbicacion._searchableInstance.sync === 'function') {
            selectUbicacion._searchableInstance.sync();
          }
          handleUbicacionChange();
        }

        // Cargar lotes específicos para la ubicación restaurada (o general si no hay)
        await loadLotes(otToRestore, draft.ubicod || (selectUbicacion ? selectUbicacion.value : null));

        // 4. Restaurar Lote seleccionado si sigue pendiente en esta ubicación
        if (draft.lotcod && selectLote && selectLote.querySelector(`option[value="${draft.lotcod}"]`)) {
          selectLote.value = draft.lotcod;
          if (selectLote && selectLote._searchableInstance && typeof selectLote._searchableInstance.sync === 'function') {
            selectLote._searchableInstance.sync();
          }
          handleLoteChange();
        } else if (selectLote && selectLote.options.length > 1) {
          selectLote.selectedIndex = 1;
          if (selectLote && selectLote._searchableInstance && typeof selectLote._searchableInstance.sync === 'function') {
            selectLote._searchableInstance.sync();
          }
          handleLoteChange();
        } else if (selectLote) {
          selectLote.value = '';
          if (selectLote && selectLote._searchableInstance && typeof selectLote._searchableInstance.sync === 'function') {
            selectLote._searchableInstance.sync();
          }
          handleLoteChange();
        }
      }

      // 5. Restaurar Cantidad y VU
      if (draft.cantidadIngresar && inputCantidadIngresar) {
        inputCantidadIngresar.value = draft.cantidadIngresar;
      }
      if (draft.vuIngresar && inputVuIngresar) {
        inputVuIngresar.value = draft.vuIngresar;
      }

      // 6. Restaurar Operarios
      if (Array.isArray(draft.workers) && draft.workers.length > 0) {
        selectedOperarios.clear();
        // Si todos los operarios vinieron con costuraNum = 1 por el borrador anterior y hay múltiples, redistribuir secuencialmente
        const allOnCosturaOne = draft.workers.length > 1 && draft.workers.every(w => (w.costuraNum || 1) === 1);
        const cantCosturasDraft = parseInt(draft.cantidadIngresar || 0, 10) || 0;

        draft.workers.forEach((w, idx) => {
          let cNum = w.costuraNum || 1;
          if (allOnCosturaOne && (cantCosturasDraft > 1 || !cantCosturasDraft)) {
            cNum = (cantCosturasDraft > 0 && idx >= cantCosturasDraft) ? cantCosturasDraft : (idx + 1);
          }
          selectedOperarios.set(w.usucod, {
            usucod: w.usucod,
            usunom: w.usunom,
            costuraNum: cNum,
            cantidad: (draft.tiptra === 'J' && w.cantidad !== undefined) ? w.cantidad : 1,
            vu: w.vu
          });
        });
        modalSelectedCodes = Array.isArray(draft.modalSelectedCodes) && draft.modalSelectedCodes.length > 0 
          ? draft.modalSelectedCodes 
          : draft.workers.map(w => w.usucod);

        recalculateWorkerValues();
        renderSelectedOperarios();
      }

      if (btnAgregarOperario && activeOt && selectUbicacion && selectUbicacion.value) {
        btnAgregarOperario.disabled = false;
      }
    } catch (err) {
      console.error('Error restaurando borrador de producción:', err);
    }
  }

})();
