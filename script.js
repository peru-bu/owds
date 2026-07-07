const EXEC_URL = "https://script.google.com/macros/s/AKfycbyAqvhpj1EQIGHsPpbEXNPZUCpICbcP6v6kfXro5chDX8AFt3S5hVyeXvnijxMGy8pmmg/exec";

let DATA = [];
let currentRows = [];
let DATA_ACIS = [];
let currentRowsAcis = [];

function aplicarTema_(tema) {
  document.documentElement.setAttribute("data-theme", tema);

  const boton = document.getElementById("themeToggle");
  if (boton) boton.textContent = tema === "light" ? "🌙" : "☀️";

  try {
    localStorage.setItem("owds-theme", tema);
  } catch (e) {
    // Almacenamiento no disponible (modo privado, etc.): el tema simplemente no se recuerda.
  }
}

function alternarTema() {
  const actual = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  aplicarTema_(actual === "light" ? "dark" : "light");
}

function inicializarTema_() {
  let guardado = null;

  try {
    guardado = localStorage.getItem("owds-theme");
  } catch (e) {
    // Sin acceso a almacenamiento: se queda en el tema oscuro por defecto.
  }

  aplicarTema_(guardado === "light" ? "light" : "dark");
}

inicializarTema_();

function cargarDatos() {
  fetch(EXEC_URL + "?formato=json")
    .then(resp => resp.json())
    .then(payload => {
      if (!payload.ok) {
        ocultarCargando_();
        mostrarError_(payload.mensaje || "No hay datos para mostrar");
        return;
      }

      DATA = payload.data || [];
      currentRows = DATA.slice();
      DATA_ACIS = payload.dataAcis || [];
      currentRowsAcis = DATA_ACIS.slice();

      document.getElementById("subtitleText").textContent =
        "Centro Oriente y Norte · Cierre mensual hasta el " + payload.infoMes.fechaCorteTexto;
      document.getElementById("fechaGenerado").textContent = payload.fechaTexto;
      document.getElementById("ultimaCarga").textContent = "Datos cargados: " + payload.ultimaCargaTexto;
      document.getElementById("antiguedadDatos").textContent = payload.antiguedadDatosTexto;

      document.getElementById("acisSubtitleText").textContent =
        "Centro Oriente y Norte · Cierre mensual hasta el " + payload.infoMes.fechaCorteTexto;
      document.getElementById("acisUltimaCarga").textContent = "Última carga: " + payload.ultimaCargaAcisTexto;
      document.getElementById("acisAntiguedadDatos").textContent = payload.antiguedadDatosAcisTexto;

      poblarSelect_("regionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("cdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("acisRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("acisCdSelect", payload.cds, "Todas las CDs");

      if (payload.regionDefault) {
        document.getElementById("regionSelect").value = payload.regionDefault;
        document.getElementById("acisRegionSelect").value = payload.regionDefault;
      }

      mountExecutivePanel();
      render();
      renderAcis();
      ocultarCargando_();
    })
    .catch(err => {
      ocultarCargando_();
      mostrarError_("No se pudo conectar con el reporte: " + err.message);
    });
}

function ocultarCargando_() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.add("hidden");
}

function poblarSelect_(id, valores, opcionTodas) {
  const select = document.getElementById(id);
  select.innerHTML = "";

  const optionTodas = document.createElement("option");
  optionTodas.value = "TODAS";
  optionTodas.textContent = opcionTodas;
  select.appendChild(optionTodas);

  (valores || []).forEach(valor => {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });
}

function mostrarError_(mensaje) {
  const el = document.getElementById("loadError");
  el.style.display = "block";
  el.textContent = mensaje;
}

function showView(viewId, button) {
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === viewId);
  });

  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link === button);
  });

  // ACIS y OWDS son reportes independientes: el header y los chips de
  // arriba son específicos de OWDS y no deben verse mientras se está
  // en una vista de ACIS (ni viceversa, si más adelante ACIS suma más
  // vistas propias).
  const esVistaAcis = viewId === "acisView";
  const owdsHero = document.getElementById("owdsHero");
  const owdsQuickFilters = document.getElementById("owdsQuickFilters");

  if (owdsHero) owdsHero.style.display = esVistaAcis ? "none" : "";
  if (owdsQuickFilters) owdsQuickFilters.style.display = esVistaAcis ? "none" : "";

  closeSidebar();

  if (viewId === "executiveView") {
    updateExecutiveSummary(currentRows);
  }

  if (viewId === "matrizView") {
    updateMatriz(currentRows);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const abrir = !sidebar.classList.contains("open");

  sidebar.classList.toggle("open", abrir);
  backdrop.classList.toggle("open", abrir);
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  sidebar.classList.remove("open");
  backdrop.classList.remove("open");
}

function mountExecutivePanel() {
  const grid = document.getElementById("executiveGrid");
  const mount = document.getElementById("executiveMount");

  if (grid && mount && grid.parentElement !== mount) {
    mount.appendChild(grid);
  }
}

function setQuickEstado(value) {
  const select = document.getElementById("estadoSelect");

  if (!select) return;

  select.value = value;
  render();
}

function updateQuickFilters(value) {
  document.querySelectorAll(".quick-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.estado === value);
  });
}

function isMobileView() {
  return window.matchMedia && window.matchMedia("(max-width: 1100px)").matches;
}

function comparePriorityRows(a, b) {
  const scoreA = getPriorityScore_(getStatus(a).label, a);
  const scoreB = getPriorityScore_(getStatus(b).label, b);

  if (scoreA !== scoreB) return scoreB - scoreA;
  return Number(a.calidadPct || 0) - Number(b.calidadPct || 0);
}

function toggleMobileRow(row) {
  if (!isMobileView()) return;
  row.classList.toggle("expanded");
}

function render() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const region = document.getElementById("regionSelect").value;
  const cd = document.getElementById("cdSelect").value;
  const estado = document.getElementById("estadoSelect").value;

  let filtered = DATA.filter(r => {
    const status = getStatus(r).label;

    const matchSearch =
      String(r.nombre || "").toLowerCase().includes(search) ||
      String(r.cargo || "").toLowerCase().includes(search) ||
      String(r.region || "").toLowerCase().includes(search) ||
      String(r.qr || "").toLowerCase().includes(search);

    const matchRegion = region === "TODAS" || r.region === region;
    const matchCd = cd === "TODAS" || r.cd === cd;
    const matchEstado = estado === "TODOS" || status === estado;

    return matchSearch && matchRegion && matchCd && matchEstado;
  });

  filtered = filtered.slice().sort((a, b) => Number(b.validas || 0) - Number(a.validas || 0));

  if (isMobileView()) {
    filtered = filtered.slice().sort(comparePriorityRows);
  }

  currentRows = filtered;

  updateQuickFilters(estado);
  updateKpis(currentRows);
  updateTable(currentRows);
  updateRegionChart(currentRows);
  updateCdChart(currentRows);

  if (document.getElementById("executiveView").classList.contains("active")) {
    updateExecutiveSummary(currentRows);
  }

  if (document.getElementById("matrizView").classList.contains("active")) {
    updateMatriz(currentRows);
  }
}

function sumField_(rows, field) {
  return rows.reduce((s, r) => s + Number(r[field] || 0), 0);
}

function updateKpis(rows) {
  const totalLideres = rows.length;
  const totalEjecutadas = sumField_(rows, "ejecutadas");
  const totalValidas = sumField_(rows, "validas");
  const totalRepeticion = sumField_(rows, "repeticion");
  const totalExcedentes = sumField_(rows, "excedentes");
  const calidadGlobal = totalEjecutadas > 0
    ? Math.round((totalValidas / totalEjecutadas) * 100)
    : 0;

  const evaluados = rows.filter(r => Number(r.ejecutadas || 0) > 0).length;
  const sinEjecucion = rows.filter(r => Number(r.ejecutadas || 0) === 0).length;

  document.getElementById("kpiEjecutadas").innerText = totalEjecutadas;
  document.getElementById("kpiValidas").innerText = totalValidas;
  document.getElementById("kpiExcedentes").innerText = totalExcedentes;
  document.getElementById("kpiCalidad").innerText = calidadGlobal + "%";
  document.getElementById("kpiRepeticion").innerText = totalRepeticion;
  document.getElementById("kpiEvaluados").innerText = evaluados;
  document.getElementById("kpiSinEjecucion").innerText = sinEjecucion;
  document.getElementById("kpiTotalLideres").innerText = totalLideres;
}

function updateTable(rows) {
  const tbody = document.getElementById("tableBody");

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">No hay registros con los filtros seleccionados</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function(r) {
    const status = getStatus(r);
    const qualityClass = getQualityClass(r);
    const barWidth = Math.min(Number(r.calidadPct || 0), 100);

    return ''
      + '<tr class="detail-row" onclick="toggleMobileRow(this)">'
      + '<td data-label="Líder">'
      + '<div class="name">' + escapeHtml(r.nombre) + '</div>'
      + '<div class="sub mobile-detail">QR: ' + escapeHtml(r.qr || "-") + '</div>'
      + '</td>'

      + '<td data-label="Cargo">' + escapeHtml(r.cargo) + '</td>'

      + '<td data-label="Región">'
      + '<span class="tag">' + escapeHtml(r.region || "Sin región") + '</span>'
      + '</td>'

      + '<td data-label="CD">' + escapeHtml(r.cd) + '</td>'

      + '<td data-label="Ejecutadas" class="num">' + r.ejecutadas + '</td>'

      + '<td data-label="Válidas" class="num">' + r.validas + '</td>'

      + '<td data-label="Repetición" class="num">' + r.repeticion + '</td>'

      + '<td data-label="Excedentes" class="num">' + r.excedentes + '</td>'

      + '<td data-label="% Calidad">'
      + '<div class="advance-line">'
      + '<strong>' + r.calidadPct + '%</strong>'
      + '</div>'
      + '<div class="progress">'
      + '<div class="progress-fill ' + qualityClass + '" style="width:' + barWidth + '%"></div>'
      + '</div>'
      + '<div class="sub">' + r.validas + '/' + r.ejecutadas + ' válidas</div>'
      + '</td>'

      + '<td data-label="Estado">'
      + '<span class="status ' + status.className + '">' + status.label + '</span>'
      + '</td>'

      + '</tr>';
  }).join("");
}

function updateExecutiveSummary(rows) {
  updateStatusDonut(rows);
  updatePriorityList(rows);
  updateRegionBrief(rows);
  updateCdBrief(rows);
}

function updateStatusDonut(rows) {
  const donut = document.getElementById("statusDonut");
  const legend = document.getElementById("statusLegend");
  const score = document.getElementById("healthScore");
  const total = rows.length;
  const counts = {
    correcto: 0,
    excedentes: 0,
    sinEjecucion: 0
  };

  rows.forEach(r => {
    const label = getStatus(r).label;

    if (label === "CORRECTO") counts.correcto += 1;
    else if (label === "CON EXCEDENTES") counts.excedentes += 1;
    else counts.sinEjecucion += 1;
  });

  const health = total > 0 ? Math.round((counts.correcto / total) * 100) : 0;
  const correctoPct = getPct(counts.correcto, total);
  const excedentesPct = getPct(counts.excedentes, total);
  const endCorrecto = correctoPct;
  const endExcedentes = endCorrecto + excedentesPct;

  score.innerText = health + "%";
  donut.style.background =
    "conic-gradient("
    + "var(--green) 0 " + endCorrecto + "%,"
    + "var(--amber) " + endCorrecto + "% " + endExcedentes + "%,"
    + "var(--red) " + endExcedentes + "% 100%"
    + ")";
  donut.setAttribute("aria-label", "Salud mensual " + health + "%");

  legend.innerHTML = ''
    + getLegendItem("Correcto", counts.correcto, "good")
    + getLegendItem("Con excedentes", counts.excedentes, "warn")
    + getLegendItem("Sin ejecución", counts.sinEjecucion, "bad");
}

function updatePriorityList(rows) {
  const target = document.getElementById("priorityList");
  const priority = rows
    .map(r => {
      const status = getStatus(r);

      return {
        row: r,
        status: status,
        score: getPriorityScore_(status.label, r)
      };
    })
    .filter(item => item.status.label !== "CORRECTO")
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return Number(a.row.calidadPct || 0) - Number(b.row.calidadPct || 0);
    })
    .slice(0, 6);

  if (!priority.length) {
    target.innerHTML = '<div class="empty compact">Sin pendientes críticos</div>';
    return;
  }

  target.innerHTML = priority.map(item => {
    const r = item.row;
    const width = Math.min(Number(r.calidadPct || 0), 100);
    const detalle = item.status.label === "SIN EJECUCION"
      ? "sin ejecuciones este mes"
      : Number(r.excedentes || 0) + " excedentes";

    return ''
      + '<button class="priority-item" type="button" data-search="' + escapeHtml(r.nombre) + '" onclick="focusSearch(this.dataset.search)">'
      + '<div>'
      + '<div class="priority-title">' + escapeHtml(r.nombre) + '</div>'
      + '<div class="sub">' + escapeHtml(r.region || "Sin región") + ' &middot; ' + detalle + '</div>'
      + '<div class="mini-track"><div class="mini-fill ' + getQualityClass(r) + '" style="width:' + width + '%"></div></div>'
      + '</div>'
      + '<span class="status ' + item.status.className + '">' + item.status.label + '</span>'
      + '</button>';
  }).join("");
}

function updateRegionBrief(rows) {
  const target = document.getElementById("regionBrief");
  const resumen = getRegionSummary(rows)
    .sort((a, b) => {
      if (a.excedentes !== b.excedentes) return b.excedentes - a.excedentes;
      return a.calidadPct - b.calidadPct;
    })
    .slice(0, 5);

  if (!resumen.length) {
    target.innerHTML = '<div class="empty compact">Sin regiones para mostrar</div>';
    return;
  }

  target.innerHTML = resumen.map(r => {
    const width = Math.min(r.calidadPct, 100);

    return ''
      + '<div class="company-brief-row">'
      + '<div class="company-brief-top">'
      + '<strong>' + escapeHtml(r.region) + '</strong>'
      + '<span>' + r.calidadPct + '%</span>'
      + '</div>'
      + '<div class="mini-track"><div class="mini-fill ' + getQualityClass(r) + '" style="width:' + width + '%"></div></div>'
      + '<div class="sub">' + r.excedentes + ' excedentes &middot; ' + r.sinEjecucion + ' sin ejecución</div>'
      + '</div>';
  }).join("");
}

function updateCdBrief(rows) {
  const target = document.getElementById("cdBrief");

  if (!target) return;

  const resumen = getCdSummary(rows)
    .sort((a, b) => {
      if (a.excedentes !== b.excedentes) return b.excedentes - a.excedentes;
      return a.calidadPct - b.calidadPct;
    })
    .slice(0, 5);

  if (!resumen.length) {
    target.innerHTML = '<div class="empty compact">Sin CDs para mostrar</div>';
    return;
  }

  target.innerHTML = resumen.map(r => {
    const width = Math.min(r.calidadPct, 100);

    return ''
      + '<div class="company-brief-row">'
      + '<div class="company-brief-top">'
      + '<strong>' + escapeHtml(r.cd) + '</strong>'
      + '<span>' + r.calidadPct + '%</span>'
      + '</div>'
      + '<div class="mini-track"><div class="mini-fill ' + getQualityClass(r) + '" style="width:' + width + '%"></div></div>'
      + '<div class="sub">' + r.excedentes + ' excedentes &middot; ' + r.sinEjecucion + ' sin ejecución</div>'
      + '</div>';
  }).join("");
}

function updateGroupChart_(rows, targetId, summaryFn, field) {
  const chart = document.getElementById(targetId);
  const resumen = summaryFn(rows).sort((a, b) => {
    if (a.calidadPct !== b.calidadPct) return a.calidadPct - b.calidadPct;
    return b.excedentes - a.excedentes;
  });

  if (!resumen.length) {
    chart.innerHTML = '<div class="empty">No hay datos para graficar</div>';
    return;
  }

  chart.innerHTML = resumen.map(function(r) {
    const width = Math.min(r.calidadPct, 100);
    const qualityClass = getQualityClass(r);
    const label = r[field];

    return ''
      + '<div class="chart-row">'
      + '<div class="chart-label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</div>'
      + '<div>'
      + '<div class="chart-track">'
      + '<div class="chart-bar ' + qualityClass + '" style="width:' + width + '%"></div>'
      + '</div>'
      + '<div class="sub">'
      + r.validas + '/' + r.ejecutadas + ' válidas &middot; '
      + r.lideres + ' líderes &middot; '
      + r.excedentes + ' excedentes &middot; '
      + r.sinEjecucion + ' sin ejecución'
      + '</div>'
      + '</div>'
      + '<div class="chart-value">' + r.calidadPct + '%</div>'
      + '</div>';
  }).join("");
}

function updateRegionChart(rows) {
  updateGroupChart_(rows, "regionChart", getRegionSummary, "region");
}

function updateCdChart(rows) {
  updateGroupChart_(rows, "cdChart", getCdSummary, "cd");
}

function getGroupSummary_(rows, field, fallback) {
  const grouped = {};

  rows.forEach(r => {
    const key = r[field] || fallback;

    if (!grouped[key]) {
      grouped[key] = {
        [field]: key,
        lideres: 0,
        ejecutadas: 0,
        validas: 0,
        excedentes: 0,
        sinEjecucion: 0,
        rows: []
      };
    }

    grouped[key].lideres += 1;
    grouped[key].ejecutadas += Number(r.ejecutadas || 0);
    grouped[key].validas += Number(r.validas || 0);
    grouped[key].excedentes += Number(r.excedentes || 0);
    if (!r.ejecutadas) grouped[key].sinEjecucion += 1;
    grouped[key].rows.push(r);
  });

  return Object.values(grouped).map(r => {
    r.calidadPct = r.ejecutadas > 0
      ? Math.round((r.validas / r.ejecutadas) * 100)
      : 0;

    return r;
  });
}

function getRegionSummary(rows) {
  return getGroupSummary_(rows, "region", "Sin región");
}

function getCdSummary(rows) {
  return getGroupSummary_(rows, "cd", "Sin CD");
}

function getAllProcesos_() {
  const totals = {};

  DATA.forEach(r => {
    const procesos = r.procesos || {};

    Object.keys(procesos).forEach(proceso => {
      totals[proceso] = (totals[proceso] || 0) + Number(procesos[proceso] || 0);
    });
  });

  return Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
}

function updateMatriz(rows) {
  const head = document.getElementById("matrizHead");
  const body = document.getElementById("matrizBody");
  const procesos = getAllProcesos_();

  head.innerHTML = ''
    + '<tr>'
    + '<th>Líder</th>'
    + procesos.map(p => '<th>' + escapeHtml(p) + '</th>').join('')
    + '<th>Total válidas</th>'
    + '</tr>';

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="' + (procesos.length + 2) + '" class="empty">No hay registros con los filtros seleccionados</td></tr>';
    return;
  }

  const filasConTotal = rows.map(r => {
    const procesosLider = r.procesos || {};
    const total = procesos.reduce((s, p) => s + Number(procesosLider[p] || 0), 0);
    return { r: r, procesosLider: procesosLider, total: total };
  }).sort((a, b) => b.total - a.total);

  body.innerHTML = filasConTotal.map(fila => {
    const r = fila.r;
    const cells = procesos.map(p => {
      const valor = Number(fila.procesosLider[p] || 0);
      return '<td>' + (valor || '-') + '</td>';
    }).join('');

    return ''
      + '<tr>'
      + '<td><div class="name">' + escapeHtml(r.nombre) + '</div><div class="sub">' + escapeHtml(r.cd || '') + '</div></td>'
      + cells
      + '<td><strong>' + fila.total + '</strong></td>'
      + '</tr>';
  }).join('');
}

function focusSearch(value) {
  const input = document.getElementById("searchInput");
  input.value = value;
  render();
  input.focus();
}

function getPriorityScore_(status, row) {
  let score = 0;

  if (status === "CON EXCEDENTES") score += 500 + Number(row.excedentes || 0) * 10;
  if (status === "SIN EJECUCION") score += 300;

  return score;
}

function getPct(value, total) {
  return total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;
}

function getLegendItem(label, value, className) {
  return ''
    + '<div class="legend-item">'
    + '<span class="legend-dot ' + className + '"></span>'
    + '<span>' + label + '</span>'
    + '<strong>' + value + '</strong>'
    + '</div>';
}

function getStatus(r) {
  if (!Number(r.ejecutadas || 0)) {
    return { label: "SIN EJECUCION", className: "bad" };
  }

  if (Number(r.excedentes || 0) > 0) {
    return { label: "CON EXCEDENTES", className: "risk" };
  }

  return { label: "CORRECTO", className: "ok" };
}

function getQualityClass(r) {
  const ejecutadas = Number(r.ejecutadas || 0);
  const excedentes = Number(r.excedentes || 0);
  const calidadPct = Number(r.calidadPct || 0);

  if (ejecutadas === 0) return "bad";
  if (excedentes > 0) return "warn";
  if (calidadPct >= 90) return "good";
  if (calidadPct >= 70) return "mid";
  return "warn";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAcis() {
  const search = document.getElementById("acisSearchInput").value.toLowerCase();
  const region = document.getElementById("acisRegionSelect").value;
  const cd = document.getElementById("acisCdSelect").value;
  const estado = document.getElementById("acisEstadoSelect").value;

  let filtered = DATA_ACIS.filter(r => {
    const status = getStatusAcis(r).label;

    const matchSearch =
      String(r.nombre || "").toLowerCase().includes(search) ||
      String(r.cargo || "").toLowerCase().includes(search) ||
      String(r.region || "").toLowerCase().includes(search) ||
      String(r.qr || "").toLowerCase().includes(search);

    const matchRegion = region === "TODAS" || r.region === region;
    const matchCd = cd === "TODAS" || r.cd === cd;
    const matchEstado = estado === "TODOS" || status === estado;

    return matchSearch && matchRegion && matchCd && matchEstado;
  });

  filtered = filtered.slice().sort((a, b) => Number(b.reportes || 0) - Number(a.reportes || 0));

  currentRowsAcis = filtered;

  updateAcisKpis(currentRowsAcis);
  updateAcisTable(currentRowsAcis);
}

function updateAcisKpis(rows) {
  const totalLideres = rows.length;
  const totalReportes = rows.reduce((s, r) => s + Number(r.reportes || 0), 0);
  const totalMeta = rows.reduce((s, r) => s + Number(r.meta || 0), 0);

  const totalReporteValido = rows.reduce((s, r) => {
    const meta = Number(r.meta || 0);
    const reporte = Number(r.reportes || 0);
    return s + Math.min(reporte, meta);
  }, 0);

  const avanceGlobal = totalMeta > 0
    ? Math.round((totalReporteValido / totalMeta) * 100)
    : 0;

  const sinReporte = rows.filter(r => Number(r.reportes || 0) === 0).length;

  const enRiesgo = rows.filter(r => {
    const label = getStatusAcis(r).label;
    return label === "EN RIESGO" || label === "SIN REPORTE" || label === "CIERRE HOY";
  }).length;

  document.getElementById("acisKpiReportes").innerText = totalReportes;
  document.getElementById("acisKpiMeta").innerText = totalMeta;
  document.getElementById("acisKpiAvance").innerText = avanceGlobal + "%";
  document.getElementById("acisKpiSinReporte").innerText = sinReporte;
  document.getElementById("acisKpiRiesgo").innerText = enRiesgo;
  document.getElementById("acisKpiTotalLideres").innerText = totalLideres;
}

function updateAcisTable(rows) {
  const tbody = document.getElementById("acisTableBody");

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">No hay registros con los filtros seleccionados</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function(r) {
    const status = getStatusAcis(r);
    const avanceClass = getAvanceClassAcis_(r.avance, r.avanceEsperado, r.reportes);
    const barWidth = Math.min(Number(r.avance || 0), 100);

    return ''
      + '<tr>'
      + '<td><div class="name">' + escapeHtml(r.nombre) + '</div><div class="sub">QR: ' + escapeHtml(r.qr || "-") + '</div></td>'
      + '<td>' + escapeHtml(r.cargo) + '</td>'
      + '<td><span class="tag">' + escapeHtml(r.region || "Sin región") + '</span></td>'
      + '<td>' + escapeHtml(r.cd) + '</td>'
      + '<td class="num">' + r.reportes + '</td>'
      + '<td class="num">' + r.meta + '</td>'
      + '<td>'
      + '<div class="advance-line"><strong>' + r.avance + '%</strong></div>'
      + '<div class="progress"><div class="progress-fill ' + avanceClass + '" style="width:' + barWidth + '%"></div></div>'
      + '<div class="sub">' + r.reportes + '/' + r.meta + ' reportes</div>'
      + '</td>'
      + '<td><span class="status ' + status.className + '">' + status.label + '</span></td>'
      + '</tr>';
  }).join("");
}

function getStatusAcis(r) {
  const avance = Number(r.avance || 0);
  const reporte = Number(r.reportes || 0);
  const avanceEsperado = Number(r.avanceEsperado || 0);
  const diasRestantes = Number(r.diasRestantesMes || 0);

  if (diasRestantes === 0 && avance < 100) {
    return { label: "CIERRE HOY", className: "bad" };
  }

  if (reporte === 0) {
    return { label: "SIN REPORTE", className: "bad" };
  }

  if (avance >= 100) {
    return { label: "CERRADO", className: "ok" };
  }

  if (avance >= avanceEsperado) {
    return { label: "BUEN RITMO", className: "ok" };
  }

  return { label: "EN RIESGO", className: "risk" };
}

function getAvanceClassAcis_(avance, avanceEsperado, reporte) {
  avance = Number(avance || 0);
  avanceEsperado = Number(avanceEsperado || 0);
  reporte = Number(reporte || 0);

  if (reporte === 0) return "bad";
  if (avance >= 100) return "good";
  if (avance >= avanceEsperado) return "good";
  if (avance >= avanceEsperado - 10) return "mid";
  if (avance >= 40) return "warn";
  return "bad";
}

cargarDatos();

const footerYearEl = document.getElementById("footerYear");
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
