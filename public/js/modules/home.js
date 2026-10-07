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

  // DOM Elements - Modal
  const modalDetalle = document.getElementById('modalDetalle');
  const modalTitle = document.getElementById('modalDetalleTitle');
  const modalResumen = document.getElementById('modalCabeceraResumen');
  const modalTbody = document.getElementById('modalDetalleTbody');
  const modalTfoot = document.getElementById('modalDetalleTfoot');
  const btnCloseModal = document.getElementById('btnCloseModalDetalle');
  const btnCerrarModal = document.getElementById('btnCerrarModalDetalle');

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

  // Event Listeners - Modal Close
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', closeModal);

  if (modalDetalle) {
    modalDetalle.addEventListener('click', (e) => {
      if (e.target === modalDetalle) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalDetalle && modalDetalle.classList.contains('active')) {
      closeModal();
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
        <td style="padding: 10px; text-align: center; white-space: nowrap;">
          <button type="button" class="btn btn-soft btn-open-detail" style="padding: 4px 10px; font-size: 0.78rem; font-weight: 700;" data-cpcod="${h.cpcod}">
            Ver Detalle
          </button>
          <button type="button" class="btn btn-danger btn-delete-record" style="padding: 4px 8px; font-size: 0.78rem; font-weight: 700; margin-left: 6px;" data-cpcod="${h.cpcod}" title="Eliminar registro">
            Eliminar
          </button>
        </td>
      `;

      // Clic en fila abre modal de detalle
      tr.addEventListener('click', () => {
        openDetailModal(h);
      });

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

      renderModalDetails(details);
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

  function renderModalDetails(details) {
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

    let sumTotal = 0;

    let rowsHtml = '';
    details.forEach(d => {
      sumTotal += Number(d.total || 0);

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
          <td style="text-align: center; padding: 8px; font-weight: 700;">
            ${fmtNum(d.cantidad)}
          </td>
          <td style="text-align: right; padding: 8px; color: var(--text-800);">
            ${fmtNum(d.valor_unitario)}
          </td>
          <td style="text-align: right; padding: 8px; color: var(--text-800);">
            S/ ${fmtMoney(d.tarifa)}
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
        <td style="padding: 10px; text-align: center; color: var(--brand-900);">
          ${details.length}
        </td>
        <td colspan="2" style="padding: 10px; text-align: right; color: var(--muted);">
          &mdash;
        </td>
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
      await loadProduccionHeaders();
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
