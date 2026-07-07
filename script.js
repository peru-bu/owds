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

      const subtitleOwds = "Cierre mensual hasta el " + payload.infoMes.fechaCorteTexto;
      const OWDS_PREFIXES = ["", "regionView", "executiveView", "matrizView"];

      OWDS_PREFIXES.forEach(prefix => {
        pintarHeroTexto_(prefix, subtitleOwds, payload.fechaTexto, payload.ultimaCargaTexto, payload.antiguedadDatosTexto);
      });

      const subtitleAcis = subtitleOwds;
      const ACIS_PREFIXES = ["acis", "regionAcis", "prioridadAcis", "riesgos"];

      ACIS_PREFIXES.forEach(prefix => {
        pintarHeroTexto_(prefix, subtitleAcis, payload.fechaTexto, payload.ultimaCargaAcisTexto, payload.antiguedadDatosAcisTexto);
      });

      poblarSelect_("regionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("cdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("regionViewRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("regionViewCdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("executiveViewRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("executiveViewCdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("matrizViewRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("matrizViewCdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("acisRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("acisCdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("regionAcisRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("regionAcisCdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("prioridadAcisRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("prioridadAcisCdSelect", payload.cds, "Todas las CDs");
      poblarSelect_("riesgosRegionSelect", payload.regiones, "Todas las regiones");
      poblarSelect_("riesgosCdSelect", payload.cds, "Todas las CDs");

      if (payload.regionDefault) {
        document.getElementById("regionSelect").value = payload.regionDefault;
        document.getElementById("regionViewRegionSelect").value = payload.regionDefault;
        document.getElementById("executiveViewRegionSelect").value = payload.regionDefault;
        document.getElementById("matrizViewRegionSelect").value = payload.regionDefault;
        document.getElementById("acisRegionSelect").value = payload.regionDefault;
        document.getElementById("regionAcisRegionSelect").value = payload.regionDefault;
        document.getElementById("prioridadAcisRegionSelect").value = payload.regionDefault;
        document.getElementById("riesgosRegionSelect").value = payload.regionDefault;
      }

      render();
      renderRegionView();
      renderExecutiveView();
      renderMatrizView();
      renderAcis();
      renderRegionAcis();
      renderPrioridadAcis();
      renderRiesgos();
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

function pintarHeroTexto_(prefix, subtitle, fechaTexto, ultimaCargaTexto, antiguedadTexto) {
  const subtitleEl = document.getElementById(prefix ? prefix + "SubtitleText" : "subtitleText");
  const fechaEl = document.getElementById(prefix ? prefix + "FechaGenerado" : "fechaGenerado");
  const ultimaCargaEl = document.getElementById(prefix ? prefix + "UltimaCarga" : "ultimaCarga");
  const antiguedadEl = document.getElementById(prefix ? prefix + "AntiguedadDatos" : "antiguedadDatos");

  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (fechaEl) fechaEl.textContent = fechaTexto;
  if (ultimaCargaEl) ultimaCargaEl.textContent = "Datos cargados: " + ultimaCargaTexto;
  if (antiguedadEl) antiguedadEl.textContent = antiguedadTexto;
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

const ACIS_VIEW_IDS = ["acisView", "regionAcisView", "prioridadAcisView", "riesgosView"];

function esVistaAcis_(viewId) {
  return ACIS_VIEW_IDS.indexOf(viewId) !== -1;
}

function showView(viewId, button) {
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === viewId);
  });

  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link === button);
  });

  closeSidebar();

  if (viewId === "regionView") {
    renderRegionView();
  }

  if (viewId === "executiveView") {
    renderExecutiveView();
  }

  if (viewId === "matrizView") {
    renderMatrizView();
  }

  if (viewId === "regionAcisView") {
    renderRegionAcis();
  }

  if (viewId === "prioridadAcisView") {
    renderPrioridadAcis();
  }

  if (viewId === "riesgosView") {
    renderRiesgos();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const toggle = document.getElementById("sidebarToggle");
  const abrir = !sidebar.classList.contains("open");

  sidebar.classList.toggle("open", abrir);
  backdrop.classList.toggle("open", abrir);
  if (toggle) toggle.classList.toggle("hidden", abrir);
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const toggle = document.getElementById("sidebarToggle");

  sidebar.classList.remove("open");
  backdrop.classList.remove("open");
  if (toggle) toggle.classList.remove("hidden");
}

function selectGroup(grupo) {
  const esOwds = grupo === "owds";
  const grupoOwds = document.getElementById("sidebarGroupOwds");
  const grupoAcis = document.getElementById("sidebarGroupAcis");

  grupoOwds.classList.toggle("collapsed", !esOwds);
  grupoAcis.classList.toggle("collapsed", esOwds);

  const vistaActiva = document.querySelector(".view-panel.active");
  const vistaActivaEsAcis = vistaActiva ? esVistaAcis_(vistaActiva.id) : false;

  if (esOwds && vistaActivaEsAcis) {
    showView("collaboratorsView", document.querySelector('.sidebar-link[data-view="collaboratorsView"]'));
  } else if (!esOwds && !vistaActivaEsAcis) {
    showView("acisView", document.querySelector('.sidebar-link[data-view="acisView"]'));
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

function toggleMobileRow(row) {
  if (!isMobileView()) return;
  row.classList.toggle("expanded");
}

function filtrarOwdsPorTexto_(rows, search, region, cd) {
  return rows.filter(r => {
    const matchSearch =
      String(r.nombre || "").toLowerCase().includes(search) ||
      String(r.cargo || "").toLowerCase().includes(search) ||
      String(r.region || "").toLowerCase().includes(search) ||
      String(r.qr || "").toLowerCase().includes(search);

    const matchRegion = region === "TODAS" || r.region === region;
    const matchCd = cd === "TODAS" || r.cd === cd;

    return matchSearch && matchRegion && matchCd;
  });
}

function render() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const region = document.getElementById("regionSelect").value;
  const cd = document.getElementById("cdSelect").value;
  const estado = document.getElementById("estadoSelect").value;

  let filtered = filtrarOwdsPorTexto_(DATA, search, region, cd).filter(r => {
    const status = getStatus(r).label;
    return estado === "TODOS" || status === estado;
  });

  filtered = filtered.slice().sort((a, b) => Number(b.validas || 0) - Number(a.validas || 0));

  currentRows = filtered;

  updateQuickFilters(estado);
  pintarOwdsKpis_("", computeOwdsKpis_(currentRows));
  updateTable(currentRows);
}

function renderOwdsFiltradoPor_(prefix) {
  const search = document.getElementById(prefix + "SearchInput").value.toLowerCase();
  const region = document.getElementById(prefix + "RegionSelect").value;
  const cd = document.getElementById(prefix + "CdSelect").value;
  const estado = document.getElementById(prefix + "EstadoSelect").value;

  let filtered = filtrarOwdsPorTexto_(DATA, search, region, cd).filter(r => {
    const status = getStatus(r).label;
    return estado === "TODOS" || status === estado;
  });

  filtered = filtered.slice().sort((a, b) => Number(b.validas || 0) - Number(a.validas || 0));

  pintarOwdsKpis_(prefix, computeOwdsKpis_(filtered));

  return filtered;
}

function renderRegionView() {
  const filtered = renderOwdsFiltradoPor_("regionView");
  updateRegionChart(filtered);
  updateCdChart(filtered);
}

function renderExecutiveView() {
  const filtered = renderOwdsFiltradoPor_("executiveView");
  updateExecutiveSummary(filtered);
}

function renderMatrizView() {
  const filtered = renderOwdsFiltradoPor_("matrizView");
  updateMatriz(filtered);
}

function sumField_(rows, field) {
  return rows.reduce((s, r) => s + Number(r[field] || 0), 0);
}

function computeOwdsKpis_(rows) {
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

  return {
    totalLideres: totalLideres,
    totalEjecutadas: totalEjecutadas,
    totalValidas: totalValidas,
    totalRepeticion: totalRepeticion,
    totalExcedentes: totalExcedentes,
    calidadGlobal: calidadGlobal,
    evaluados: evaluados,
    sinEjecucion: sinEjecucion
  };
}

function getOwdsKpiIds_(prefix) {
  const base = prefix ? prefix + "Kpi" : "kpi";

  return {
    ejecutadas: base + "Ejecutadas",
    validas: base + "Validas",
    excedentes: base + "Excedentes",
    calidad: base + "Calidad",
    repeticion: base + "Repeticion",
    evaluados: base + "Evaluados",
    sinEjecucion: base + "SinEjecucion",
    totalLideres: base + "TotalLideres"
  };
}

function pintarOwdsKpis_(prefix, kpis) {
  const ids = getOwdsKpiIds_(prefix);

  document.getElementById(ids.ejecutadas).innerText = kpis.totalEjecutadas;
  document.getElementById(ids.validas).innerText = kpis.totalValidas;
  document.getElementById(ids.excedentes).innerText = kpis.totalExcedentes;
  document.getElementById(ids.calidad).innerText = kpis.calidadGlobal + "%";
  document.getElementById(ids.repeticion).innerText = kpis.totalRepeticion;
  document.getElementById(ids.evaluados).innerText = kpis.evaluados;
  document.getElementById(ids.sinEjecucion).innerText = kpis.sinEjecucion;
  document.getElementById(ids.totalLideres).innerText = kpis.totalLideres;
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

      + '<td data-label="Cargo" class="mobile-detail">' + escapeHtml(r.cargo) + '</td>'

      + '<td data-label="Región">'
      + '<span class="tag">' + escapeHtml(r.region || "Sin región") + '</span>'
      + '</td>'

      + '<td data-label="CD" class="mobile-detail">' + escapeHtml(r.cd) + '</td>'

      + '<td data-label="Ejecutadas" class="num">' + r.ejecutadas + '</td>'

      + '<td data-label="Válidas" class="num">' + r.validas + '</td>'

      + '<td data-label="Repetición" class="num mobile-detail">' + r.repeticion + '</td>'

      + '<td data-label="Excedentes" class="num">' + r.excedentes + '</td>'

      + '<td data-label="% Calidad" class="mobile-full">'
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

function filtrarAcisPorTexto_(rows, search, region, cd) {
  return rows.filter(r => {
    const matchSearch =
      String(r.nombre || "").toLowerCase().includes(search) ||
      String(r.cargo || "").toLowerCase().includes(search) ||
      String(r.region || "").toLowerCase().includes(search) ||
      String(r.qr || "").toLowerCase().includes(search);

    const matchRegion = region === "TODAS" || r.region === region;
    const matchCd = cd === "TODAS" || r.cd === cd;

    return matchSearch && matchRegion && matchCd;
  });
}

function renderAcis() {
  const search = document.getElementById("acisSearchInput").value.toLowerCase();
  const region = document.getElementById("acisRegionSelect").value;
  const cd = document.getElementById("acisCdSelect").value;
  const estado = document.getElementById("acisEstadoSelect").value;

  let filtered = filtrarAcisPorTexto_(DATA_ACIS, search, region, cd).filter(r => {
    const status = getStatusAcis(r).label;
    return estado === "TODOS" || status === estado;
  });

  filtered = filtered.slice().sort((a, b) => Number(b.reportes || 0) - Number(a.reportes || 0));

  currentRowsAcis = filtered;

  updateAcisKpis(currentRowsAcis);
  updateAcisTable(currentRowsAcis);
}

function filtrarAcisPorEstado_(rows, estado) {
  return rows.filter(r => {
    const status = getStatusAcis(r).label;
    return estado === "TODOS" || status === estado;
  });
}

function renderRegionAcis() {
  const search = document.getElementById("regionAcisSearchInput").value.toLowerCase();
  const region = document.getElementById("regionAcisRegionSelect").value;
  const cd = document.getElementById("regionAcisCdSelect").value;
  const estado = document.getElementById("regionAcisEstadoSelect").value;

  const filtered = filtrarAcisPorEstado_(filtrarAcisPorTexto_(DATA_ACIS, search, region, cd), estado);

  pintarAcisKpis_("regionAcis", computeAcisKpis_(filtered));
  updateAcisRegionChart(filtered);
  updateAcisCdChart(filtered);
}

function renderPrioridadAcis() {
  const search = document.getElementById("prioridadAcisSearchInput").value.toLowerCase();
  const region = document.getElementById("prioridadAcisRegionSelect").value;
  const cd = document.getElementById("prioridadAcisCdSelect").value;
  const estado = document.getElementById("prioridadAcisEstadoSelect").value;

  const filtered = filtrarAcisPorEstado_(filtrarAcisPorTexto_(DATA_ACIS, search, region, cd), estado);

  pintarAcisKpis_("prioridadAcis", computeAcisKpis_(filtered));
  updateAcisPrioritySummary(filtered);
}

function getAvanceEsperadoGlobal_(rows) {
  return rows.length ? Number(rows[0].avanceEsperado || 0) : 0;
}

function getAcisGroupSummary_(rows, field, fallback) {
  const grouped = {};

  rows.forEach(r => {
    const key = r[field] || fallback;

    if (!grouped[key]) {
      grouped[key] = {
        [field]: key,
        lideres: 0,
        reportes: 0,
        meta: 0,
        sinReporte: 0,
        enRiesgo: 0
      };
    }

    grouped[key].lideres += 1;
    grouped[key].reportes += Number(r.reportes || 0);
    grouped[key].meta += Number(r.meta || 0);
    if (!Number(r.reportes || 0)) grouped[key].sinReporte += 1;

    const label = getStatusAcis(r).label;
    if (label === "EN RIESGO" || label === "CIERRE HOY") grouped[key].enRiesgo += 1;
  });

  return Object.values(grouped).map(r => {
    r.avance = r.meta > 0 ? Math.round((r.reportes / r.meta) * 100) : 0;
    return r;
  });
}

function getRegionSummaryAcis(rows) {
  return getAcisGroupSummary_(rows, "region", "Sin región");
}

function getCdSummaryAcis(rows) {
  return getAcisGroupSummary_(rows, "cd", "Sin CD");
}

function updateAcisGroupChart_(rows, targetId, summaryFn, field) {
  const chart = document.getElementById(targetId);
  const resumen = summaryFn(rows).sort((a, b) => {
    if (a.avance !== b.avance) return a.avance - b.avance;
    return b.sinReporte - a.sinReporte;
  });

  if (!resumen.length) {
    chart.innerHTML = '<div class="empty">No hay datos para graficar</div>';
    return;
  }

  const avanceEsperado = getAvanceEsperadoGlobal_(rows);

  chart.innerHTML = resumen.map(function(r) {
    const width = Math.min(r.avance, 100);
    const claseColor = getAvanceClassAcis_(r.avance, avanceEsperado, r.reportes);
    const label = r[field];

    return ''
      + '<div class="chart-row">'
      + '<div class="chart-label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</div>'
      + '<div>'
      + '<div class="chart-track">'
      + '<div class="chart-bar ' + claseColor + '" style="width:' + width + '%"></div>'
      + '</div>'
      + '<div class="sub">'
      + r.reportes + '/' + r.meta + ' reportes &middot; '
      + r.lideres + ' líderes &middot; '
      + r.sinReporte + ' sin reporte &middot; '
      + r.enRiesgo + ' en riesgo'
      + '</div>'
      + '</div>'
      + '<div class="chart-value">' + r.avance + '%</div>'
      + '</div>';
  }).join("");
}

function updateAcisRegionChart(rows) {
  updateAcisGroupChart_(rows, "regionAcisChart", getRegionSummaryAcis, "region");
}

function updateAcisCdChart(rows) {
  updateAcisGroupChart_(rows, "cdAcisChart", getCdSummaryAcis, "cd");
}

function updateAcisPrioritySummary(rows) {
  updateAcisStatusDonut(rows);
  updateAcisPriorityList(rows);
  updateAcisRegionBrief(rows);
  updateAcisCdBrief(rows);
}

function updateAcisStatusDonut(rows) {
  const donut = document.getElementById("acisStatusDonut");
  const legend = document.getElementById("acisStatusLegend");
  const score = document.getElementById("acisHealthScore");
  const total = rows.length;
  const counts = { ok: 0, risk: 0, bad: 0 };

  rows.forEach(r => {
    const className = getStatusAcis(r).className;
    counts[className] = (counts[className] || 0) + 1;
  });

  const health = total > 0 ? Math.round((counts.ok / total) * 100) : 0;
  const okPct = getPct(counts.ok, total);
  const riskPct = getPct(counts.risk, total);
  const endOk = okPct;
  const endRisk = endOk + riskPct;

  score.innerText = health + "%";
  donut.style.background =
    "conic-gradient("
    + "var(--green) 0 " + endOk + "%,"
    + "var(--amber) " + endOk + "% " + endRisk + "%,"
    + "var(--red) " + endRisk + "% 100%"
    + ")";
  donut.setAttribute("aria-label", "Salud ACIS " + health + "%");

  legend.innerHTML = ''
    + getLegendItem("Cerrado / buen ritmo", counts.ok, "good")
    + getLegendItem("En riesgo", counts.risk, "warn")
    + getLegendItem("Sin reporte / cierre hoy", counts.bad, "bad");
}

function getPriorityScoreAcis_(status, row) {
  if (status === "CIERRE HOY") return 900;
  if (status === "SIN REPORTE") return 700;

  if (status === "EN RIESGO") {
    const gap = Number(row.avanceEsperado || 0) - Number(row.avance || 0);
    return 500 + Math.max(0, gap) * 5;
  }

  return 0;
}

function updateAcisPriorityList(rows) {
  const target = document.getElementById("acisPriorityList");
  const priority = rows
    .map(r => {
      const status = getStatusAcis(r);

      return {
        row: r,
        status: status,
        score: getPriorityScoreAcis_(status.label, r)
      };
    })
    .filter(item => item.status.label !== "CERRADO" && item.status.label !== "BUEN RITMO")
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!priority.length) {
    target.innerHTML = '<div class="empty compact">Sin pendientes críticos</div>';
    return;
  }

  target.innerHTML = priority.map(item => {
    const r = item.row;
    const width = Math.min(Number(r.avance || 0), 100);
    const detalle = item.status.label === "SIN REPORTE"
      ? "sin reportes este mes"
      : item.status.label === "CIERRE HOY"
        ? "cierra hoy · " + r.avance + "% de avance"
        : r.reportes + "/" + r.meta + " reportes";

    return ''
      + '<button class="priority-item" type="button" data-search="' + escapeHtml(r.nombre) + '" onclick="focusSearchAcis(this.dataset.search)">'
      + '<div>'
      + '<div class="priority-title">' + escapeHtml(r.nombre) + '</div>'
      + '<div class="sub">' + escapeHtml(r.region || "Sin región") + ' &middot; ' + detalle + '</div>'
      + '<div class="mini-track"><div class="mini-fill ' + getAvanceClassAcis_(r.avance, r.avanceEsperado, r.reportes) + '" style="width:' + width + '%"></div></div>'
      + '</div>'
      + '<span class="status ' + item.status.className + '">' + item.status.label + '</span>'
      + '</button>';
  }).join("");
}

function updateAcisRegionBrief(rows) {
  const target = document.getElementById("acisRegionBrief");
  const avanceEsperado = getAvanceEsperadoGlobal_(rows);
  const resumen = getRegionSummaryAcis(rows)
    .sort((a, b) => {
      if (a.avance !== b.avance) return a.avance - b.avance;
      return b.sinReporte - a.sinReporte;
    })
    .slice(0, 5);

  if (!resumen.length) {
    target.innerHTML = '<div class="empty compact">Sin regiones para mostrar</div>';
    return;
  }

  target.innerHTML = resumen.map(r => {
    const width = Math.min(r.avance, 100);

    return ''
      + '<div class="company-brief-row">'
      + '<div class="company-brief-top">'
      + '<strong>' + escapeHtml(r.region) + '</strong>'
      + '<span>' + r.avance + '%</span>'
      + '</div>'
      + '<div class="mini-track"><div class="mini-fill ' + getAvanceClassAcis_(r.avance, avanceEsperado, r.reportes) + '" style="width:' + width + '%"></div></div>'
      + '<div class="sub">' + r.sinReporte + ' sin reporte &middot; ' + r.enRiesgo + ' en riesgo</div>'
      + '</div>';
  }).join("");
}

function updateAcisCdBrief(rows) {
  const target = document.getElementById("acisCdBrief");

  if (!target) return;

  const avanceEsperado = getAvanceEsperadoGlobal_(rows);
  const resumen = getCdSummaryAcis(rows)
    .sort((a, b) => {
      if (a.avance !== b.avance) return a.avance - b.avance;
      return b.sinReporte - a.sinReporte;
    })
    .slice(0, 5);

  if (!resumen.length) {
    target.innerHTML = '<div class="empty compact">Sin CDs para mostrar</div>';
    return;
  }

  target.innerHTML = resumen.map(r => {
    const width = Math.min(r.avance, 100);

    return ''
      + '<div class="company-brief-row">'
      + '<div class="company-brief-top">'
      + '<strong>' + escapeHtml(r.cd) + '</strong>'
      + '<span>' + r.avance + '%</span>'
      + '</div>'
      + '<div class="mini-track"><div class="mini-fill ' + getAvanceClassAcis_(r.avance, avanceEsperado, r.reportes) + '" style="width:' + width + '%"></div></div>'
      + '<div class="sub">' + r.sinReporte + ' sin reporte &middot; ' + r.enRiesgo + ' en riesgo</div>'
      + '</div>';
  }).join("");
}

function focusSearchAcis(value) {
  showView("acisView", document.querySelector('.sidebar-link[data-view="acisView"]'));

  const input = document.getElementById("acisSearchInput");
  input.value = value;
  renderAcis();
  input.focus();
}

function computeAcisKpis_(rows) {
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

  return {
    totalLideres: totalLideres,
    totalReportes: totalReportes,
    totalMeta: totalMeta,
    avanceGlobal: avanceGlobal,
    sinReporte: sinReporte,
    enRiesgo: enRiesgo
  };
}

function pintarAcisKpis_(prefijo, kpis) {
  document.getElementById(prefijo + "KpiReportes").innerText = kpis.totalReportes;
  document.getElementById(prefijo + "KpiMeta").innerText = kpis.totalMeta;
  document.getElementById(prefijo + "KpiAvance").innerText = kpis.avanceGlobal + "%";
  document.getElementById(prefijo + "KpiSinReporte").innerText = kpis.sinReporte;
  document.getElementById(prefijo + "KpiRiesgo").innerText = kpis.enRiesgo;
  document.getElementById(prefijo + "KpiTotalLideres").innerText = kpis.totalLideres;
}

function updateAcisKpis(rows) {
  pintarAcisKpis_("acis", computeAcisKpis_(rows));
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
      + '<tr class="detail-row" onclick="toggleMobileRow(this)">'
      + '<td data-label="Líder"><div class="name">' + escapeHtml(r.nombre) + '</div><div class="sub mobile-detail">QR: ' + escapeHtml(r.qr || "-") + '</div></td>'
      + '<td data-label="Cargo" class="mobile-detail">' + escapeHtml(r.cargo) + '</td>'
      + '<td data-label="Región"><span class="tag">' + escapeHtml(r.region || "Sin región") + '</span></td>'
      + '<td data-label="CD" class="mobile-detail">' + escapeHtml(r.cd) + '</td>'
      + '<td data-label="Reportes" class="num">' + r.reportes + '</td>'
      + '<td data-label="Meta" class="num">' + r.meta + '</td>'
      + '<td data-label="Avance" class="mobile-full">'
      + '<div class="advance-line"><strong>' + r.avance + '%</strong></div>'
      + '<div class="progress"><div class="progress-fill ' + avanceClass + '" style="width:' + barWidth + '%"></div></div>'
      + '<div class="sub">' + r.reportes + '/' + r.meta + ' reportes</div>'
      + '</td>'
      + '<td data-label="Estado"><span class="status ' + status.className + '">' + status.label + '</span></td>'
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

function renderRiesgos() {
  const search = document.getElementById("riesgosSearchInput").value.toLowerCase();
  const region = document.getElementById("riesgosRegionSelect").value;
  const cd = document.getElementById("riesgosCdSelect").value;
  const estado = document.getElementById("riesgosEstadoSelect").value;

  const filtered = filtrarAcisPorEstado_(filtrarAcisPorTexto_(DATA_ACIS, search, region, cd), estado);

  updateRiesgosKpis(filtered);
  updateRiesgosClasificacionChart(filtered);
  updateRiesgosRanking(filtered);
}

function getActoCondicionTotales_(rows) {
  const totales = {
    "Acto Inseguro": 0,
    "Acto Seguro": 0,
    "Condición Inseguro": 0,
    "Condición Seguro": 0
  };

  rows.forEach(r => {
    const actoCondicion = r.actoCondicion || {};

    Object.keys(actoCondicion).forEach(categoria => {
      totales[categoria] = (totales[categoria] || 0) + Number(actoCondicion[categoria] || 0);
    });
  });

  return totales;
}

function updateRiesgosKpis(rows) {
  const totales = getActoCondicionTotales_(rows);
  const actoInseguro = totales["Acto Inseguro"] || 0;
  const actoSeguro = totales["Acto Seguro"] || 0;
  const condicionInsegura = totales["Condición Inseguro"] || 0;
  const condicionSegura = totales["Condición Seguro"] || 0;
  const total = actoInseguro + actoSeguro + condicionInsegura + condicionSegura;
  const pctInseguro = total > 0
    ? Math.round(((actoInseguro + condicionInsegura) / total) * 100)
    : 0;

  document.getElementById("riesgosKpiActoInseguro").innerText = actoInseguro;
  document.getElementById("riesgosKpiActoSeguro").innerText = actoSeguro;
  document.getElementById("riesgosKpiCondicionInsegura").innerText = condicionInsegura;
  document.getElementById("riesgosKpiCondicionSegura").innerText = condicionSegura;
  document.getElementById("riesgosKpiPctInseguro").innerText = pctInseguro + "%";
  document.getElementById("riesgosKpiTotal").innerText = total;
}

function updateRiesgosClasificacionChart(rows) {
  const chart = document.getElementById("riesgosClasificacionChart");
  const totales = getActoCondicionTotales_(rows);
  const total = Object.values(totales).reduce((s, v) => s + v, 0);

  const categorias = Object.keys(totales)
    .map(categoria => ({ categoria: categoria, total: totales[categoria] }))
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  if (!categorias.length) {
    chart.innerHTML = '<div class="empty">No hay datos para graficar</div>';
    return;
  }

  chart.innerHTML = categorias.map(item => {
    const pct = getPct(item.total, total);
    const esInsegura = item.categoria.indexOf("Inseguro") !== -1;
    const claseColor = esInsegura ? "bad" : "good";

    return ''
      + '<div class="chart-row">'
      + '<div class="chart-label" title="' + escapeHtml(item.categoria) + '">' + escapeHtml(item.categoria) + '</div>'
      + '<div>'
      + '<div class="chart-track">'
      + '<div class="chart-bar ' + claseColor + '" style="width:' + pct + '%"></div>'
      + '</div>'
      + '<div class="sub">' + item.total + ' reportes</div>'
      + '</div>'
      + '<div class="chart-value">' + pct + '%</div>'
      + '</div>';
  }).join("");
}

function getRiesgosRanking_(rows, limite) {
  const totales = {};

  rows.forEach(r => {
    const riesgos = r.riesgos || {};

    Object.keys(riesgos).forEach(tipoRiesgo => {
      totales[tipoRiesgo] = (totales[tipoRiesgo] || 0) + Number(riesgos[tipoRiesgo] || 0);
    });
  });

  const lista = Object.keys(totales)
    .map(tipoRiesgo => ({ tipoRiesgo: tipoRiesgo, total: totales[tipoRiesgo] }))
    .sort((a, b) => b.total - a.total);

  return limite ? lista.slice(0, limite) : lista;
}

function updateRiesgosRanking(rows) {
  const tbody = document.getElementById("riesgosRankingBody");
  const ranking = getRiesgosRanking_(rows, 15);
  const totalGeneral = getRiesgosRanking_(rows).reduce((s, item) => s + item.total, 0);

  if (!ranking.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">No hay registros con los filtros seleccionados</td></tr>';
    return;
  }

  tbody.innerHTML = ranking.map(item => {
    const pct = getPct(item.total, totalGeneral);

    return ''
      + '<tr>'
      + '<td><div class="name">' + escapeHtml(item.tipoRiesgo) + '</div></td>'
      + '<td class="num">' + item.total + '</td>'
      + '<td class="num">' + pct + '%</td>'
      + '</tr>';
  }).join("");
}

cargarDatos();

const footerYearEl = document.getElementById("footerYear");
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
