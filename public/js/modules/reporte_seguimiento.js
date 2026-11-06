// public/js/modules/reporte_seguimiento.js
(function() {
  'use strict';

  // State
  let currentRows = [];

  // DOM Elements - Inputs
  const inputFecDesde = document.getElementById('filtroFecDesde');
  const inputFecHasta = document.getElementById('filtroFecHasta');
  const inputOt = document.getElementById('filtroOt');
  const inputLote = document.getElementById('filtroLote');
  const selectTiptra = document.getElementById('filtroTiptra');
  const inputTrabajador = document.getElementById('filtroTrabajador');

  // DOM Elements - Buttons & Badges
  const btnBuscar = document.getElementById('btnBuscar');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const btnExport = document.getElementById('btnExportExcel');
  const badgeTotal = document.getElementById('badgeTotalRegistros');
  const badgeFiltros = document.getElementById('badgeFiltrosActivos');
  const lblTotalVu = document.getElementById('lblTotalVu');
  const tbody = document.getElementById('tbodyReporteSeguimiento');

  // Initialize Event Listeners
  if (btnBuscar) {
    btnBuscar.addEventListener('click', (e) => {
      e.preventDefault();
      consultarReporte();
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      limpiarFiltros();
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      exportarExcel();
    });
  }

  const inputs = [inputFecDesde, inputFecHasta, inputOt, inputLote, selectTiptra, inputTrabajador];
  inputs.forEach(el => {
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          consultarReporte();
        }
      });
    }
  });

  // Default dates: current month or last 30 days if desired, or open
  // Let's keep inputs open so user can query across all production by default or specify a range
  consultarReporte();

  // --- Functions ---

  function obtenerParametros() {
    const params = new URLSearchParams();
    const fecDesde = inputFecDesde ? inputFecDesde.value.trim() : '';
    const fecHasta = inputFecHasta ? inputFecHasta.value.trim() : '';
    const otcod = inputOt ? inputOt.value.trim() : '';
    const lotcod = inputLote ? inputLote.value.trim() : '';
    const tiptra = selectTiptra ? selectTiptra.value.trim() : '';
    const tracod = inputTrabajador ? inputTrabajador.value.trim() : '';

    if (fecDesde) params.set('fecDesde', fecDesde);
    if (fecHasta) params.set('fecHasta', fecHasta);
    if (otcod) params.set('otcod', otcod);
    if (lotcod) params.set('lotcod', lotcod);
    if (tiptra) params.set('tiptra', tiptra);
    if (tracod) params.set('tracod', tracod);

    return params;
  }

  async function consultarReporte() {
    if (btnBuscar) {
      btnBuscar.disabled = true;
      btnBuscar.textContent = 'Buscando...';
    }

    tbody.innerHTML = `
      <tr class="row-empty">
        <td colspan="11" style="text-align: center; padding: 32px; color: var(--muted);">
          Consultando registros de producción...
        </td>
      </tr>
    `;

    const params = obtenerParametros();

    try {
      const res = await window.AppFetch('/api/reportes/seguimiento-produccion?' + params.toString());
      currentRows = (res && Array.isArray(res.data)) ? res.data : [];
      renderizarTabla(currentRows);
      actualizarResumen(params, currentRows);

      if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage(`${currentRows.length} registros cargados`, 'success');
      }
    } catch (err) {
      console.error('Error al consultar reporte de seguimiento:', err);
      tbody.innerHTML = `
        <tr class="row-empty">
          <td colspan="11" style="text-align: center; padding: 24px; color: #ef4444; font-weight: 700;">
            Ocurrió un error al cargar los datos: ${err.message || 'Error de conexión'}
          </td>
        </tr>
      `;
      if (badgeTotal) badgeTotal.textContent = 'Error al cargar';
      if (lblTotalVu) lblTotalVu.textContent = '0.00';
    } finally {
      if (btnBuscar) {
        btnBuscar.disabled = false;
        btnBuscar.textContent = 'Filtrar';
      }
    }
  }

  function renderizarTabla(data) {
    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr class="row-empty">
          <td colspan="11" style="text-align: center; padding: 32px; color: var(--muted);">
            No se encontraron registros que coincidan con los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    const htmlRows = data.map(r => {
      const fechaFmt = r.fecusucre ? formatDateTime(r.fecusucre) : '---';
      const badgeTiptra = r.tiptra === 'D'
        ? '<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">DESTAJO</span>'
        : '<span class="badge" style="background: #f3e8ff; color: #7e22ce; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">JORNAL</span>';

      const vuFormatted = Number(r.valor_unitario || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      });

      return `
        <tr>
          <td style="padding: 8px 10px; font-weight: 800; color: var(--brand-900); font-family: monospace; font-size: 0.86rem; white-space: nowrap;">
            ${escapeHtml(r.cpcod)}
          </td>
          <td style="padding: 8px 10px; color: var(--text-700); font-size: 0.8rem; white-space: nowrap;">
            ${fechaFmt}
          </td>
          <td style="padding: 8px 10px; font-weight: 700; color: var(--brand-900); font-size: 0.84rem; white-space: nowrap;">
            ${escapeHtml(r.otcod)}
          </td>
          <td style="padding: 8px 10px; color: #334155; font-size: 0.8rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(r.clinom)}">
            ${escapeHtml(r.clinom || '---')}
          </td>
          <td style="padding: 8px 10px; color: #334155; font-size: 0.8rem; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(r.pronom)}">
            ${escapeHtml(r.pronom || '---')}
          </td>
          <td style="padding: 8px 10px; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 0.84rem; white-space: nowrap;">
            ${escapeHtml(r.lotcod || '---')}
          </td>
          <td style="padding: 8px 10px; text-align: center; white-space: nowrap;">
            ${badgeTiptra}
          </td>
          <td style="padding: 8px 10px; color: #475569; font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(r.ubinom)}">
            ${escapeHtml(r.ubinom || '---')}
          </td>
          <td style="padding: 8px 10px; font-weight: 800; font-family: monospace; color: var(--brand-900); font-size: 0.84rem; white-space: nowrap;">
            ${escapeHtml(r.tracod)}
          </td>
          <td style="padding: 8px 10px; font-weight: 600; color: #1e293b; font-size: 0.82rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(r.traraz)}">
            ${escapeHtml(r.traraz || '---')}
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 800; font-family: monospace; color: var(--brand-900); font-size: 0.88rem; white-space: nowrap;">
            ${vuFormatted}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = htmlRows.join('');
  }

  function actualizarResumen(params, data) {
    // Total count
    if (badgeTotal) {
      badgeTotal.textContent = `${data.length.toLocaleString('es-PE')} registros`;
    }

    // Sum VU
    let sumVu = 0;
    for (const r of data) {
      sumVu += Number(r.valor_unitario || 0);
    }
    if (lblTotalVu) {
      lblTotalVu.textContent = sumVu.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    // Active filters label
    if (badgeFiltros) {
      const active = [];
      if (params.get('fecDesde')) active.push(`Desde: ${params.get('fecDesde')}`);
      if (params.get('fecHasta')) active.push(`Hasta: ${params.get('fecHasta')}`);
      if (params.get('otcod')) active.push(`OT: ${params.get('otcod')}`);
      if (params.get('lotcod')) active.push(`Lote: ${params.get('lotcod')}`);
      if (params.get('tiptra')) active.push(`Tipo: ${params.get('tiptra') === 'D' ? 'DESTAJO' : 'JORNAL'}`);
      if (params.get('tracod')) active.push(`Trabajador: ${params.get('tracod')}`);

      if (active.length > 0) {
        badgeFiltros.textContent = `Filtros: ${active.join(' | ')}`;
        badgeFiltros.style.color = '#0284c7';
        badgeFiltros.style.fontWeight = '700';
      } else {
        badgeFiltros.textContent = 'Sin filtros activos (Mostrando histórico reciente)';
        badgeFiltros.style.color = '#64748b';
        badgeFiltros.style.fontWeight = '400';
      }
    }
  }

  function limpiarFiltros() {
    if (inputFecDesde) inputFecDesde.value = '';
    if (inputFecHasta) inputFecHasta.value = '';
    if (inputOt) inputOt.value = '';
    if (inputLote) inputLote.value = '';
    if (selectTiptra) selectTiptra.value = '';
    if (inputTrabajador) inputTrabajador.value = '';
    consultarReporte();
  }

  function exportarExcel() {
    if (!currentRows || currentRows.length === 0) {
      if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
        window.StatusBar.showMessage('No hay registros disponibles para exportar con los filtros actuales', 'warning');
      } else {
        alert('No hay registros disponibles para exportar.');
      }
      return;
    }

    const params = obtenerParametros();
    if (window.StatusBar && typeof window.StatusBar.showMessage === 'function') {
      window.StatusBar.showMessage('Generando archivo Excel del reporte de seguimiento...', 'info');
    }

    function getAbsoluteUrl(url) {
      if (url && url.startsWith('/') && window.BASE_URL) {
        return window.BASE_URL + url.slice(1);
      }
      return url;
    }

    window.location.href = getAbsoluteUrl('/api/reportes/seguimiento-produccion/exportar?' + params.toString());
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
      return String(isoString);
    } catch {
      return String(isoString);
    }
  }

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();

