// public/js/modules/home.js
(function() {
  'use strict';

  // State
  let allHeaders = [];
  const loadedDetails = new Map(); // cpcod -> Array of workers
  let expandedRows = new Set(); // Set of open cpcods

  // DOM Elements
  const tbody = document.getElementById('tbodyProduccionHeaders');
  const searchInput = document.getElementById('regSearchInput');
  const typeFilter = document.getElementById('regTypeFilter');
  const countBadge = document.getElementById('regCountBadge');
  const btnRefresh = document.getElementById('btnRefreshRegs');
  const btnExport = document.getElementById('btnExportExcel');
  const refreshIcon = document.getElementById('refreshIcon');

  // Event Listeners
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

  // Initial Load
  loadHeaders();

  // --- Functions ---

  async function loadHeaders(isManualRefresh = false) {
    if (isManualRefresh && refreshIcon) {
      refreshIcon.style.display = 'inline-block';
      refreshIcon.style.animation = 'spin 0.8s linear infinite';
    }

    if (!isManualRefresh) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 28px; color: var(--muted);">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <span>⏳</span> Cargando registros de producción...
            </div>
          </td>
        </tr>
      `;
    }

    try {
      const data = await window.AppFetch('/api/produccion/registros?limite=150');
      allHeaders = Array.isArray(data) ? data : [];
      applyFiltersAndRender();

      if (isManualRefresh && window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage('Registros de producción actualizados', 'success');
      }
    } catch (err) {
      console.error('Error al cargar registros de producción:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 24px; color: var(--danger, #dc2626);">
            Error al consultar registros: ${err.message}
          </td>
        </tr>
      `;
      countBadge.textContent = 'Error de carga';
    } finally {
      if (refreshIcon) {
        refreshIcon.style.animation = '';
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

    // Update count badge
    if (countBadge) {
      countBadge.textContent = `${filtered.length} registro${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 32px 16px; color: var(--muted);">
            <div style="font-size: 1.5rem; margin-bottom: 6px;">📂</div>
            <div style="font-weight: 700; color: var(--text-900);">No se encontraron registros</div>
            <div style="font-size: 0.82rem; margin-top: 4px;">Intenta cambiar el criterio de búsqueda o el filtro de tipo.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(h => {
      const isExpanded = expandedRows.has(h.cpcod);
      const tr = document.createElement('tr');
      tr.className = 'reg-header-row';
      tr.style.cursor = 'pointer';
      tr.style.borderBottom = '1px solid var(--border)';
      tr.style.transition = 'background 0.15s ease';
      tr.dataset.cpcod = h.cpcod;

      const fechaFmt = h.fecusucre ? formatDateTime(h.fecusucre) : '---';
      const badgeTiptra = h.tiptra === 'D'
        ? '<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; border-radius: 6px; padding: 2px 8px;">DESTAJO</span>'
        : '<span class="badge" style="background: #f3e8ff; color: #7e22ce; font-weight: 700; border-radius: 6px; padding: 2px 8px;">JORNAL</span>';

      tr.innerHTML = `
        <td style="padding: 10px 8px; text-align: center; color: var(--muted); font-size: 0.8rem;" class="toggle-cell">
          <span class="chevron" style="display: inline-block; transition: transform 0.2s ease; ${isExpanded ? 'transform: rotate(90deg);' : ''}">▶</span>
        </td>
        <td style="padding: 10px 12px; font-weight: 800; color: var(--brand-900); font-family: monospace; font-size: 0.9rem;">
          ${h.cpcod}
        </td>
        <td style="padding: 10px 12px; color: var(--text-700); font-size: 0.82rem; white-space: nowrap;">
          ${fechaFmt}
        </td>
        <td style="padding: 10px 12px; font-weight: 700; color: var(--text-900);">
          ${h.otcod}
        </td>
        <td style="padding: 10px 12px; color: var(--text-800); font-family: monospace;">
          ${h.lotcod || '---'}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          ${badgeTiptra}
        </td>
        <td style="padding: 10px 12px; font-weight: 600; color: var(--text-900);">
          <span style="font-size: 0.75rem; color: var(--muted); display: block; font-family: monospace;">${h.ubicod}</span>
          ${h.ubinom}
        </td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700;">
          ${Number(h.cantidad).toFixed(2)} <span style="font-size: 0.75rem; color: var(--muted); font-weight: 500;">${h.unidad}</span>
        </td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: var(--brand-900);">
          ${h.tiptra === 'D' ? 'S/ ' + Number(h.valor_unitario).toFixed(2) : '---'}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span class="badge" style="background: var(--surface-100); color: var(--text-800); font-weight: 700; padding: 3px 8px; border-radius: 12px; border: 1px solid var(--border);">
            👥 ${h.totalOperarios}
          </span>
        </td>
        <td style="padding: 10px 12px; font-size: 0.8rem; color: var(--muted); font-weight: 600;">
          ${h.codusucre || '---'}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <button type="button" class="btn btn--ghost btn-toggle-detail" style="padding: 4px 8px; font-size: 0.78rem; border-radius: 6px;" data-cpcod="${h.cpcod}">
            ${isExpanded ? 'Ocultar ▲' : 'Ver Detalle ▼'}
          </button>
        </td>
      `;

      // Hover row effect
      tr.addEventListener('mouseenter', () => {
        tr.style.background = 'var(--surface-50, #f8fafc)';
      });
      tr.addEventListener('mouseleave', () => {
        tr.style.background = isExpanded ? 'var(--surface-50, #f8fafc)' : '';
      });

      // Click to toggle
      tr.addEventListener('click', (e) => {
        // Evitar doble toggle si hace clic directo en el botón
        toggleDetailRow(h.cpcod);
      });

      tbody.appendChild(tr);

      // Fila expandible de detalle
      const detailTr = document.createElement('tr');
      detailTr.id = `detail-row-${h.cpcod}`;
      detailTr.className = 'reg-detail-tr';
      detailTr.style.display = isExpanded ? 'table-row' : 'none';
      detailTr.innerHTML = `
        <td colspan="12" style="padding: 0; background: var(--surface-50, #f8fafc); border-bottom: 2px solid var(--border);">
          <div id="detail-container-${h.cpcod}" style="padding: 14px 20px 18px 24px; border-left: 4px solid var(--brand-700);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="font-weight: 800; font-size: 0.88rem; color: var(--brand-900); display: flex; align-items: center; gap: 8px;">
                <span>👥</span> Desglose de Operarios Asignados (Registro #${h.cpcod} — OT: ${h.otcod})
              </div>
              <span style="font-size: 0.8rem; color: var(--muted);">Lote: <strong>${h.lotcod || '---'}</strong> | Ubicación: <strong>${h.ubinom}</strong></span>
            </div>
            <div id="detail-content-${h.cpcod}">
              <div style="text-align: center; padding: 14px; color: var(--muted); font-size: 0.85rem;">
                Cargando operarios...
              </div>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(detailTr);

      if (isExpanded) {
        fetchAndRenderDetail(h.cpcod);
      }
    });
  }

  async function toggleDetailRow(cpcod) {
    const detailRow = document.getElementById(`detail-row-${cpcod}`);
    const headerRow = tbody.querySelector(`tr.reg-header-row[data-cpcod="${cpcod}"]`);
    if (!detailRow || !headerRow) return;

    const btn = headerRow.querySelector('.btn-toggle-detail');
    const chevron = headerRow.querySelector('.chevron');

    if (expandedRows.has(cpcod)) {
      expandedRows.delete(cpcod);
      detailRow.style.display = 'none';
      if (btn) btn.textContent = 'Ver Detalle ▼';
      if (chevron) chevron.style.transform = 'rotate(0deg)';
      headerRow.style.background = '';
    } else {
      expandedRows.add(cpcod);
      detailRow.style.display = 'table-row';
      if (btn) btn.textContent = 'Ocultar ▲';
      if (chevron) chevron.style.transform = 'rotate(90deg)';
      headerRow.style.background = 'var(--surface-50, #f8fafc)';
      fetchAndRenderDetail(cpcod);
    }
  }

  async function fetchAndRenderDetail(cpcod) {
    const contentEl = document.getElementById(`detail-content-${cpcod}`);
    if (!contentEl) return;

    if (loadedDetails.has(cpcod)) {
      renderDetailTable(contentEl, loadedDetails.get(cpcod));
      return;
    }

    try {
      const details = await window.AppFetch(`/api/produccion/registros/${encodeURIComponent(cpcod)}/detalle`);
      loadedDetails.set(cpcod, details);
      renderDetailTable(contentEl, details);
    } catch (err) {
      console.error(`Error al cargar detalle de ${cpcod}:`, err);
      contentEl.innerHTML = `
        <div style="color: var(--danger, #dc2626); padding: 8px 0; font-size: 0.85rem;">
          No se pudo cargar el detalle de operarios: ${err.message}
        </div>
      `;
    }
  }

  function renderDetailTable(container, details) {
    if (!details || details.length === 0) {
      container.innerHTML = `
        <div style="padding: 10px; color: var(--muted); font-size: 0.85rem; text-align: center;">
          No hay operarios registrados en el detalle de este ingreso.
        </div>
      `;
      return;
    }

    let sumCant = 0;
    let sumVu = 0;
    let sumTotal = 0;

    let rowsHtml = '';
    details.forEach(d => {
      sumCant += Number(d.cantidad || 0);
      sumVu += Number(d.valor_unitario || 0);
      sumTotal += Number(d.total || 0);

      rowsHtml += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 6px 10px; font-weight: 700; color: var(--muted); text-align: center; width: 36px;">
            ${d.cpnum}
          </td>
          <td style="padding: 6px 10px; font-family: monospace; font-weight: 800; color: var(--brand-900); width: 90px;">
            ${d.tracod}
          </td>
          <td style="padding: 6px 10px; font-weight: 700; color: var(--text-900);">
            ${d.traraz || '---'}
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 700; width: 110px;">
            <span style="background: #fff; border: 1px solid var(--border); padding: 2px 8px; border-radius: 6px;">
              # ${Number(d.cantidad).toFixed(2)}
            </span>
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 700; width: 110px; color: var(--text-800);">
            S/ ${Number(d.valor_unitario).toFixed(4)}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; width: 110px; color: var(--brand-900);">
            S/ ${Number(d.total).toFixed(4)}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div style="overflow-x: auto; background: #fff; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background: var(--surface-100); text-align: left; border-bottom: 1.5px solid var(--border);">
              <th style="padding: 8px 10px; font-weight: 800; color: var(--brand-900); text-align: center;">#</th>
              <th style="padding: 8px 10px; font-weight: 800; color: var(--brand-900);">Código</th>
              <th style="padding: 8px 10px; font-weight: 800; color: var(--brand-900);">Nombre del Trabajador</th>
              <th style="padding: 8px 10px; font-weight: 800; color: var(--brand-900); text-align: center;">Cantidad (#)</th>
              <th style="padding: 8px 10px; font-weight: 800; color: var(--brand-900); text-align: right;">VU Operario</th>
              <th style="padding: 8px 10px; font-weight: 800; color: var(--brand-900); text-align: right;">Total (S/)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: var(--surface-100); font-weight: 800; border-top: 2px solid var(--border);">
              <td colspan="3" style="padding: 8px 10px; text-align: right; color: var(--brand-900);">
                TOTALES (${details.length} operarios):
              </td>
              <td style="padding: 8px 10px; text-align: center; color: var(--brand-900);">
                ${sumCant.toFixed(2)}
              </td>
              <td style="padding: 8px 10px; text-align: right; color: var(--brand-900);">
                S/ ${sumVu.toFixed(4)}
              </td>
              <td style="padding: 8px 10px; text-align: right; color: var(--brand-900);">
                S/ ${sumTotal.toFixed(4)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
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

    // Trigger direct file download
    window.location.href = '/api/produccion/registros/exportar';
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

  // Inject keyframe animation for spinner
  if (!document.getElementById('spin-keyframes')) {
    const style = document.createElement('style');
    style.id = 'spin-keyframes';
    style.textContent = `
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .reg-header-row:hover .chevron { color: var(--brand-700); }
    `;
    document.head.appendChild(style);
  }

})();
