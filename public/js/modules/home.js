// public/js/modules/home.js
(function() {
  'use strict';

  // State
  let allHeaders = [];
  const loadedDetails = new Map(); // cpcod -> Array of workers

  // DOM Elements - Table & Filters
  const tbody = document.getElementById('tbodyProduccionHeaders');
  const searchInput = document.getElementById('regSearchInput');
  const typeFilter = document.getElementById('regTypeFilter');
  const countBadge = document.getElementById('regCountBadge');
  const btnRefresh = document.getElementById('btnRefreshRegs');
  const btnExport = document.getElementById('btnExportExcel');

  // DOM Elements - Modal Detalle
  const modalDetalle = document.getElementById('modalDetalle');
  const modalTitle = document.getElementById('modalDetalleTitle');
  const modalResumen = document.getElementById('modalCabeceraResumen');
  const modalTbody = document.getElementById('modalDetalleTbody');
  const modalTfoot = document.getElementById('modalDetalleTfoot');
  const btnCloseModal = document.getElementById('btnCloseModalDetalle');
  const btnCerrarModal = document.getElementById('btnCerrarModalDetalle');

  // DOM Elements - Modal Editar
  const modalEditar = document.getElementById('modalEditar');
  const modalEditarTitle = document.getElementById('modalEditarTitle');
  const modalEditarResumen = document.getElementById('modalEditarResumen');
  const modalEditarBadge = document.getElementById('modalEditarBalanceBadge');
  const modalEditarTbody = document.getElementById('modalEditarTbody');
  const modalEditarTfoot = document.getElementById('modalEditarTfoot');
  const modalEditarAlert = document.getElementById('modalEditarAlert');
  const btnCloseModalEditar = document.getElementById('btnCloseModalEditar');
  const btnCancelarModalEditar = document.getElementById('btnCancelarModalEditar');
  const btnGuardarModalEditar = document.getElementById('btnGuardarModalEditar');

  // Event Listeners - Filters
  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFiltersAndRender, 200);
    });
  }

  if (typeFilter) {
    typeFilter.addEventListener('change', applyFiltersAndRender);
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadHeaders(true);
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', handleExportExcel);
  }

  // Event Listeners - Modal Close & Edit Handlers
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', closeModal);

  if (btnCloseModalEditar) btnCloseModalEditar.addEventListener('click', closeEditModal);
  if (btnCancelarModalEditar) btnCancelarModalEditar.addEventListener('click', closeEditModal);
  if (btnGuardarModalEditar) btnGuardarModalEditar.addEventListener('click', saveEditModal);

  if (modalDetalle) {
    modalDetalle.addEventListener('click', (e) => {
      if (e.target === modalDetalle) {
        closeModal();
      }
    });
  }

  if (modalEditar) {
    modalEditar.addEventListener('click', (e) => {
      if (e.target === modalEditar) {
        closeEditModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalDetalle && modalDetalle.classList.contains('active')) closeModal();
      if (modalEditar && modalEditar.classList.contains('active')) closeEditModal();
    }
  });

  // Initial Load
  loadHeaders();

  // --- Functions ---

  async function loadHeaders(isManualRefresh = false) {
    if (isManualRefresh && btnRefresh) {
      btnRefresh.disabled = true;
      btnRefresh.textContent = 'Actualizando...';
    }

    if (!isManualRefresh) {
      tbody.innerHTML = `
        <tr class="row-empty">
          <td colspan="13" style="text-align: center; padding: 24px; color: var(--muted);">
            Cargando registros de producción...
          </td>
        </tr>
      `;
    }

    try {
      const data = await window.AppFetch('/api/produccion/registros?limite=200');
      allHeaders = Array.isArray(data) ? data : [];
      applyFiltersAndRender();

      if (isManualRefresh && window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage('Registros de producción actualizados', 'success');
      }
    } catch (err) {
      console.error('Error al cargar registros de producción:', err);
      tbody.innerHTML = `
        <tr class="row-empty">
          <td colspan="13" style="text-align: center; padding: 24px; color: var(--danger, #dc2626); font-weight: 700;">
            Error al consultar registros: ${err.message}
          </td>
        </tr>
      `;
      if (countBadge) countBadge.textContent = 'Error de carga';
    } finally {
      if (isManualRefresh && btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.textContent = 'Actualizar';
      }
    }
  }

  function applyFiltersAndRender() {
    const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const type = typeFilter ? typeFilter.value : '';

    const filtered = allHeaders.filter(h => {
      if (type && h.tiptra !== type) return false;
      if (!q) return true;

      return (
        (h.cpcod && h.cpcod.toLowerCase().includes(q)) ||
        (h.otcod && h.otcod.toLowerCase().includes(q)) ||
        (h.lotcod && h.lotcod.toLowerCase().includes(q)) ||
        (h.ubinom && h.ubinom.toLowerCase().includes(q)) ||
        (h.ubicod && h.ubicod.toLowerCase().includes(q)) ||
        (h.codusucre && h.codusucre.toLowerCase().includes(q))
      );
    });

    if (countBadge) {
      countBadge.textContent = `${filtered.length} registro${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr class="row-empty">
          <td colspan="13" style="text-align: center; padding: 28px 16px; color: var(--muted);">
            <div style="font-weight: 700; color: var(--text-900); font-size: 0.95rem;">No se encontraron registros</div>
            <div style="font-size: 0.8rem; margin-top: 4px;">Modifique los términos de búsqueda o el filtro de tipo de trabajo.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(h => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      const fechaFmt = h.fecusucre ? formatDateTime(h.fecusucre) : '---';
      const badgeTiptra = h.tiptra === 'D'
        ? '<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">DESTAJO</span>'
        : '<span class="badge" style="background: #f3e8ff; color: #7e22ce; font-weight: 700;">JORNAL</span>';

      tr.innerHTML = `
        <td style="padding: 10px; font-weight: 800; color: var(--brand-900); font-family: monospace; font-size: 0.9rem;">
          ${h.cpcod}
        </td>
        <td style="padding: 10px; color: var(--text-700); font-size: 0.82rem; white-space: nowrap;">
          ${fechaFmt}
        </td>
        <td style="padding: 10px; font-weight: 700; color: var(--text-900);">
          ${h.otcod}
        </td>
        <td style="padding: 10px; color: var(--text-800); font-family: monospace;">
          ${h.lotcod || '---'}
        </td>
        <td style="padding: 10px; text-align: center;">
          ${badgeTiptra}
        </td>
        <td style="padding: 10px; font-weight: 600; color: var(--text-900); white-space: nowrap;">
          ${h.ubicod} - ${h.ubinom}
        </td>
        <td style="padding: 10px; text-align: right; font-weight: 700;">
          ${fmtNum(h.cantidad)}
        </td>
        <td style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-900);">
          ${h.tiptra === 'D' ? fmtNum(h.valor_unitario) : '---'}
        </td>
        <td style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-800);">
          ${h.tiptra === 'D' ? 'S/ ' + fmtMoney(h.tarifa) : '---'}
        </td>
        <td style="padding: 10px; text-align: right; font-weight: 800; color: var(--brand-900);">
          ${h.tiptra === 'D' ? 'S/ ' + fmtMoney(h.totalSol) : '---'}
        </td>
        <td style="padding: 10px; text-align: center;">
          <span class="badge" style="background: var(--surface-100); color: var(--text-800); font-weight: 700; padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-color, #e2e8f0);">
            ${h.totalOperarios} operario${h.totalOperarios === 1 ? '' : 's'}
          </span>
        </td>
        <td style="padding: 10px; font-size: 0.8rem; color: var(--muted); font-weight: 600;">
          ${h.codusucre || '---'}
        </td>
        <td class="col-actions" style="padding: 8px 10px; text-align: center; white-space: nowrap; width: 280px; min-width: 280px; max-width: none !important; overflow: visible !important;">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 5px;">
            <button type="button" class="btn btn-soft btn-open-detail" style="padding: 4px 8px; font-size: 0.78rem; font-weight: 700; white-space: nowrap;" data-cpcod="${h.cpcod}">
              Ver Detalle
            </button>
            <button type="button" class="btn btn-warning btn-edit-record" style="padding: 4px 8px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" data-cpcod="${h.cpcod}" title="Editar registro">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Editar
            </button>
            <button type="button" class="btn btn-danger btn-delete-record" style="padding: 4px 8px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" data-cpcod="${h.cpcod}" title="Eliminar registro">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Eliminar
            </button>
          </div>
        </td>
      `;

      // Clic en fila abre modal de detalle
      tr.addEventListener('click', () => {
        openDetailModal(h);
      });

      // Clic en Editar
      const btnEdit = tr.querySelector('.btn-edit-record');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(h);
        });
      }

      // Clic en Eliminar
      const btnDelete = tr.querySelector('.btn-delete-record');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmDeleteRecord(h.cpcod);
        });
      }

      tbody.appendChild(tr);
    });
  }

  // --- Modal Operations ---

  async function openDetailModal(header) {
    if (!modalDetalle) return;

    modalTitle.textContent = `Detalle de Registro #${header.cpcod}`;

    const fechaFmt = header.fecusucre ? formatDateTime(header.fecusucre) : '---';
    modalResumen.innerHTML = `
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Orden de Trabajo</span>
        <strong style="color: var(--brand-900); font-size: 0.95rem;">${header.otcod}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Lote</span>
        <strong style="color: var(--text-900); font-family: monospace;">${header.lotcod || '---'}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Tipo de Trabajo</span>
        <strong>${header.tiptraDesc || (header.tiptra === 'D' ? 'DESTAJO' : 'JORNAL')}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Ubicación</span>
        <strong style="color: var(--text-900);">${header.ubicod} - ${header.ubinom}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Cantidad Cabecera</span>
        <strong>${fmtNum(header.cantidad)}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">VU Cabecera</span>
        <strong style="color: var(--text-900);">${header.tiptra === 'D' ? fmtNum(header.valor_unitario) : '---'}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">S/ Cabecera</span>
        <strong id="modalCabeceraTotal" style="color: var(--brand-900);">${header.tiptra === 'D' ? 'S/ ' + fmtMoney(header.totalSol) : '---'}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Fecha / Hora</span>
        <span style="color: var(--text-800);">${fechaFmt}</span>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Registrado Por</span>
        <span style="color: var(--text-800); font-weight: 600;">${header.codusucre || '---'}</span>
      </div>
    `;

    const isJornal = header.tiptra === 'J';
    const thDetCant = document.getElementById('thModalDetalleCant');
    const thDetVu = document.getElementById('thModalDetalleVu');
    if (thDetCant) thDetCant.style.display = isJornal ? 'none' : '';
    if (thDetVu) thDetVu.textContent = isJornal ? 'CANTIDAD' : 'VU';

    modalTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--muted);">
          Cargando operarios del registro...
        </td>
      </tr>
    `;
    modalTfoot.innerHTML = '';

    modalDetalle.classList.add('active');

    // Cargar trabajadores
    try {
      let details;
      if (loadedDetails.has(header.cpcod)) {
        details = loadedDetails.get(header.cpcod);
      } else {
        details = await window.AppFetch(`/api/produccion/registros/${encodeURIComponent(header.cpcod)}/detalle`);
        loadedDetails.set(header.cpcod, details);
      }

      renderModalDetails(details, header);
    } catch (err) {
      console.error('Error al cargar detalle:', err);
      modalTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px; color: var(--danger); font-weight: 700;">
            No se pudo obtener el detalle: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  function renderModalDetails(details, header) {
    if (!details || details.length === 0) {
      modalTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px; color: var(--muted);">
            No hay operarios registrados en este ingreso.
          </td>
        </tr>
      `;
      modalTfoot.innerHTML = '';
      return;
    }

    const isJornal = header && header.tiptra === 'J';
    let sumTotal = 0;
    let sumVu = 0;

    let rowsHtml = '';
    details.forEach(d => {
      sumTotal += Number(d.total || 0);
      sumVu += Number(d.valor_unitario || 0);

      rowsHtml += `
        <tr>
          <td style="text-align: center; padding: 8px; font-weight: 700; color: var(--muted);">
            ${d.cpnum}
          </td>
          <td style="padding: 8px; font-family: monospace; font-weight: 800; color: var(--brand-900);">
            ${d.tracod}
          </td>
          <td style="padding: 8px; font-weight: 700; color: var(--text-900);">
            ${d.traraz || '---'}
          </td>
          ${isJornal ? '' : `
          <td style="text-align: center; padding: 8px; font-weight: 700;">
            ${fmtNum(d.cantidad)}
          </td>
          `}
          <td style="text-align: right; padding: 8px; color: var(--text-800); font-weight: ${isJornal ? '800' : 'normal'};">
            ${fmtNum(d.valor_unitario)}
          </td>
          <td style="text-align: right; padding: 8px; color: var(--text-800);">
            ${header && header.tiptra === 'D' ? ('S/ ' + fmtMoney(d.tarifa)) : (Number(d.tarifa) > 0 ? ('S/ ' + fmtMoney(d.tarifa)) : '---')}
          </td>
          <td style="text-align: right; padding: 8px; font-weight: 800; color: var(--brand-900);">
            S/ ${fmtMoney(d.total)}
          </td>
        </tr>
      `;
    });

    modalTbody.innerHTML = rowsHtml;

    modalTfoot.innerHTML = `
      <tr>
        <td colspan="3" style="padding: 10px; text-align: right; color: var(--brand-900); text-transform: uppercase;">
          TOTALES (${details.length} operarios):
        </td>
        ${isJornal ? `
        <td style="padding: 10px; text-align: right; color: var(--brand-900); font-weight: 800;">
          ${Number.isInteger(sumVu) ? sumVu : parseFloat(sumVu.toFixed(2))}
        </td>
        ` : `
        <td style="padding: 10px; text-align: center; color: var(--brand-900);">
          ${details.length}
        </td>
        <td style="padding: 10px; text-align: right; color: var(--muted);">&mdash;</td>
        `}
        <td style="padding: 10px; text-align: right; color: var(--muted);">&mdash;</td>
        <td style="padding: 10px; text-align: right; color: var(--brand-900); font-weight: 800; font-size: 0.95rem;">
          S/ ${fmtMoney(sumTotal)}
        </td>
      </tr>
    `;

    const cabTotalEl = document.getElementById('modalCabeceraTotal');
    if (cabTotalEl) cabTotalEl.textContent = 'S/ ' + fmtMoney(sumTotal);
  }

  function closeModal() {
    if (modalDetalle) {
      modalDetalle.classList.remove('active');
    }
  }

  // --- Modal Editar Operations ---
  let currentEditingHeader = null;
  let currentEditingDetails = [];

  async function openEditModal(header) {
    if (!modalEditar) return;
    currentEditingHeader = header;
    modalEditarTitle.textContent = `Editar Registro #${header.cpcod}`;
    modalEditarAlert.style.display = 'none';

    const fechaFmt = header.fecusucre ? formatDateTime(header.fecusucre) : '---';
    modalEditarResumen.innerHTML = `
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Orden de Trabajo</span>
        <strong style="color: var(--brand-900); font-size: 0.95rem;">${header.otcod}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Lote</span>
        <strong style="color: var(--text-900); font-family: monospace;">${header.lotcod || '---'}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Tipo de Trabajo</span>
        <strong style="color: ${header.tiptra === 'D' ? 'var(--brand-700)' : '#d97706'}; font-weight: 800;">
          ${header.tiptraDesc || (header.tiptra === 'D' ? 'DESTAJO' : 'JORNAL')}
        </strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Ubicación</span>
        <strong style="color: var(--text-900);">${header.ubicod} - ${header.ubinom}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Tarifa Registrada</span>
        <strong style="color: var(--text-900);">${header.tiptra === 'D' ? 'S/ ' + fmtMoney(header.tarifa) : '---'}</strong>
      </div>
      <div>
        <span style="color: var(--muted); display: block; font-size: 0.75rem; text-transform: uppercase;">Fecha Creación</span>
        <span style="color: var(--text-800);">${fechaFmt}</span>
      </div>
    `;

    const isJornal = header.tiptra === 'J';
    const thEditCant = document.getElementById('thModalEditarCant');
    const thEditVu = document.getElementById('thModalEditarVu');
    if (thEditCant) thEditCant.style.display = isJornal ? 'none' : '';
    if (thEditVu) thEditVu.textContent = isJornal ? 'CANTIDAD' : 'VU';

    modalEditarTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--muted);">
          Cargando datos para edición...
        </td>
      </tr>
    `;
    modalEditarTfoot.innerHTML = '';
    modalEditar.classList.add('active');

    try {
      let details;
      if (loadedDetails.has(header.cpcod)) {
        details = JSON.parse(JSON.stringify(loadedDetails.get(header.cpcod)));
      } else {
        const raw = await window.AppFetch(`/api/produccion/registros/${encodeURIComponent(header.cpcod)}/detalle`);
        loadedDetails.set(header.cpcod, raw);
        details = JSON.parse(JSON.stringify(raw));
      }
      currentEditingDetails = details;
      renderModalEditRows(details, header);
    } catch (err) {
      console.error('Error al cargar detalle para edición:', err);
      modalEditarTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px; color: var(--danger); font-weight: 700;">
            No se pudo obtener el detalle: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  function renderModalEditRows(details, header) {
    if (!details || details.length === 0) {
      modalEditarTbody.innerHTML = '<tr class="row-empty"><td colspan="7">No hay operarios en este registro.</td></tr>';
      modalEditarTfoot.innerHTML = '';
      return;
    }

    const isDestajo = header.tiptra === 'D';
    const isJornal = header.tiptra === 'J';
    let rowsHtml = '';

    details.forEach((d, idx) => {
      const tarifaVal = Number(d.tarifa || header.tarifa || 0);
      const subtotal = isDestajo 
        ? (Number(d.valor_unitario || 0) * tarifaVal) 
        : (Number(d.cantidad || 0) * Number(d.valor_unitario || 0) * (tarifaVal > 0 ? tarifaVal : 1));

      rowsHtml += `
        <tr data-index="${idx}">
          <td style="text-align: center; padding: 8px; font-weight: 700; color: var(--muted);">
            ${d.cpnum || (idx + 1)}
          </td>
          <td style="padding: 8px; font-family: monospace; font-weight: 800; color: var(--brand-900);">
            ${d.tracod}
          </td>
          <td style="padding: 8px; font-weight: 700; color: var(--text-900);">
            ${d.traraz || '---'}
          </td>
          ${isJornal ? '' : `
          <td style="text-align: center; padding: 6px;">
            <input type="number" class="input edit-cant-input" data-index="${idx}" value="${d.cantidad}" min="0" step="any" style="width: 84px; height: 32px; text-align: center; font-weight: 800; font-size: 0.9rem; padding: 2px 4px; border-radius: 6px;" />
          </td>
          `}
          <td style="text-align: right; padding: 6px;">
            <input type="number" class="input edit-vu-input" data-index="${idx}" value="${d.valor_unitario}" min="0" step="any" style="width: 84px; height: 32px; text-align: right; font-weight: 800; font-size: 0.9rem; padding: 2px 4px; border-radius: 6px;" />
          </td>
          <td style="text-align: right; padding: 8px; color: var(--text-800);">
            ${isDestajo ? ('S/ ' + fmtMoney(tarifaVal)) : (tarifaVal > 0 ? ('S/ ' + fmtMoney(tarifaVal)) : '---')}
          </td>
          <td style="text-align: right; padding: 8px; font-weight: 800; color: var(--brand-900);" class="edit-row-subtotal">
            S/ ${fmtMoney(subtotal)}
          </td>
        </tr>
      `;
    });

    modalEditarTbody.innerHTML = rowsHtml;

    // Listeners para recálculo dinámico en vivo
    if (!isJornal) {
      modalEditarTbody.querySelectorAll('.edit-cant-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const i = parseInt(e.target.dataset.index, 10);
          details[i].cantidad = parseFloat(e.target.value || 0);
          recalculateModalEditTotals(header);
        });
      });
    }

    modalEditarTbody.querySelectorAll('.edit-vu-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.index, 10);
        details[i].valor_unitario = parseFloat(e.target.value || 0);
        recalculateModalEditTotals(header);
      });
    });

    recalculateModalEditTotals(header);
  }

  function recalculateModalEditTotals(header) {
    if (!currentEditingDetails) return;
    const isDestajo = header.tiptra === 'D';
    const isJornal = header.tiptra === 'J';
    let totalCant = 0;
    let totalVu = 0;
    let totalSol = 0;

    currentEditingDetails.forEach((d, idx) => {
      const cant = isJornal ? 1 : Number(d.cantidad || 0);
      const vu = Number(d.valor_unitario || 0);
      const tarifaVal = Number(d.tarifa || header.tarifa || 0);
      totalCant += cant;
      totalVu += vu;

      const subtotal = isDestajo 
        ? (vu * tarifaVal) 
        : (cant * vu * (tarifaVal > 0 ? tarifaVal : 1));
      totalSol += subtotal;

      const row = modalEditarTbody.querySelector(`tr[data-index="${idx}"]`);
      if (row) {
        const subtotalCell = row.querySelector('.edit-row-subtotal');
        if (subtotalCell) subtotalCell.textContent = 'S/ ' + fmtMoney(subtotal);
      }
    });

    if (isJornal) {
      modalEditarTfoot.innerHTML = `
        <tr>
          <td colspan="3" style="padding: 10px; text-align: right; color: var(--brand-900); text-transform: uppercase;">
            TOTALES (${currentEditingDetails.length} operarios):
          </td>
          <td style="padding: 10px; text-align: right; color: var(--brand-900); font-weight: 800;">
            ${Number.isInteger(totalVu) ? totalVu : parseFloat(totalVu.toFixed(2))}
          </td>
          <td style="padding: 10px; text-align: right; color: var(--muted);">&mdash;</td>
          <td style="padding: 10px; text-align: right; color: var(--brand-900); font-weight: 800; font-size: 0.95rem;">
            S/ ${fmtMoney(totalSol)}
          </td>
        </tr>
      `;

      if (modalEditarBadge) {
        modalEditarBadge.textContent = `Total Asignado: ${Number.isInteger(totalVu) ? totalVu : parseFloat(totalVu.toFixed(2))} | S/ ${fmtMoney(totalSol)}`;
      }
    } else {
      modalEditarTfoot.innerHTML = `
        <tr>
          <td colspan="3" style="padding: 10px; text-align: right; color: var(--brand-900); text-transform: uppercase;">
            TOTALES (${currentEditingDetails.length} operarios):
          </td>
          <td style="padding: 10px; text-align: center; color: var(--brand-900); font-weight: 800;">
            ${Number.isInteger(totalCant) ? totalCant : parseFloat(totalCant.toFixed(2))}
          </td>
          <td colspan="2" style="padding: 10px; text-align: right; color: var(--muted);">&mdash;</td>
          <td style="padding: 10px; text-align: right; color: var(--brand-900); font-weight: 800; font-size: 0.95rem;">
            S/ ${fmtMoney(totalSol)}
          </td>
        </tr>
      `;

      if (modalEditarBadge) {
        modalEditarBadge.textContent = `Total Asignado: ${Number.isInteger(totalCant) ? totalCant : parseFloat(totalCant.toFixed(2))} | S/ ${fmtMoney(totalSol)}`;
      }
    }
  }

  async function saveEditModal() {
    if (!currentEditingHeader || !currentEditingDetails) return;
    modalEditarAlert.style.display = 'none';

    // Validar datos
    for (const d of currentEditingDetails) {
      if (currentEditingHeader.tiptra !== 'J' && (isNaN(d.cantidad) || d.cantidad < 0)) {
        modalEditarAlert.textContent = `La cantidad asignada para ${d.tracod} debe ser un número válido mayor o igual a 0.`;
        modalEditarAlert.className = 'status-alert alert-error';
        modalEditarAlert.style.display = 'block';
        return;
      }
      if (isNaN(d.valor_unitario) || d.valor_unitario < 0) {
        modalEditarAlert.textContent = `${currentEditingHeader.tiptra === 'J' ? 'La cantidad' : 'El valor unitario (VU)'} para ${d.tracod} debe ser un número válido.`;
        modalEditarAlert.className = 'status-alert alert-error';
        modalEditarAlert.style.display = 'block';
        return;
      }
    }

    try {
      btnGuardarModalEditar.disabled = true;
      btnGuardarModalEditar.textContent = 'Guardando...';

      const payload = {
        workers: currentEditingDetails.map(d => ({
          tracod: d.tracod,
          cantidad: currentEditingHeader.tiptra === 'J' ? 1 : Number(d.cantidad || 0),
          valor_unitario: Number(d.valor_unitario || 0),
          tarifa: Number(d.tarifa || 0)
        }))
      };

      const res = await window.AppFetch(`/api/produccion/registros/${encodeURIComponent(currentEditingHeader.cpcod)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage(res.message || `Registro #${currentEditingHeader.cpcod} actualizado exitosamente.`, 'success');
      }

      loadedDetails.delete(currentEditingHeader.cpcod);
      closeEditModal();
      await loadHeaders();
    } catch (err) {
      console.error('Error guardando cambios:', err);
      modalEditarAlert.textContent = 'Error al guardar cambios: ' + err.message;
      modalEditarAlert.className = 'status-alert alert-error';
      modalEditarAlert.style.display = 'block';
    } finally {
      btnGuardarModalEditar.disabled = false;
      btnGuardarModalEditar.textContent = 'Guardar Cambios';
    }
  }

  function closeEditModal() {
    if (modalEditar) modalEditar.classList.remove('active');
    currentEditingHeader = null;
    currentEditingDetails = [];
  }

  async function confirmDeleteRecord(cpcod) {
    if (!confirm(`¿Está seguro de eliminar el registro de control #${cpcod}?\n\nEsta acción eliminará el detalle de operarios y la cabecera permanentemente.`)) {
      return;
    }
    try {
      const res = await window.AppFetch(`/api/produccion/registros/${encodeURIComponent(cpcod)}`, {
        method: 'DELETE'
      });
      if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage(res.message || `Registro #${cpcod} eliminado correctamente`, 'success');
      }
      loadedDetails.delete(cpcod);
      await loadHeaders();
    } catch (err) {
      console.error('Error eliminando registro:', err);
      if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage(err.message, 'error');
      } else {
        alert('Error al eliminar: ' + err.message);
      }
    }
  }

  function handleExportExcel() {
    if (allHeaders.length === 0) {
      if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage('No hay registros disponibles para exportar', 'warning');
      } else {
        alert('No hay registros disponibles para exportar.');
      }
      return;
    }

    if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
      window.StatusBar.showMessage('Generando archivo Excel...', 'info');
    }

    window.location.href = '/api/produccion/registros/exportar';
  }

  /**
   * Formats a number smartly: integers show without decimals, decimals show up to 2.
   * Example: 2.00 -> "2", 2.50 -> "2.5", 10.75 -> "10.75"
   */
  function fmtNum(val) {
    const n = Number(val || 0);
    if (Number.isInteger(n)) return String(n);
    return parseFloat(n.toFixed(2)).toString();
  }

  /**
   * Formats a monetary value to 2 decimal places.
   * Example: 0.5 -> "0.50", 1 -> "1.00", 2.785 -> "2.79"
   */
  function fmtMoney(val) {
    return Number(val || 0).toFixed(2);
  }

  function formatDateTime(isoString) {
    if (!isoString) return '---';
    try {
      const match = String(isoString).match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
      if (match) {
        const [, yyyy, mm, dd, hhRaw, min] = match;
        const pad = (n) => String(n).padStart(2, '0');
        let hh = parseInt(hhRaw, 10);
        const ampm = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12;
        hh = hh ? pad(hh) : 12;
        return `${dd}/${mm}/${yyyy} ${hh}:${min} ${ampm}`;
      }
      const d = new Date(isoString);
      const pad = (n) => String(n).padStart(2, '0');
      const dd = pad(d.getDate());
      const mm = pad(d.getMonth() + 1);
      const yyyy = d.getFullYear();
      let hh = d.getHours();
      const min = pad(d.getMinutes());
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12;
      hh = hh ? pad(hh) : 12;
      return `${dd}/${mm}/${yyyy} ${hh}:${min} ${ampm}`;
    } catch {
      return isoString;
    }
  }

})();
