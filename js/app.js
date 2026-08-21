const API_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const MIN_MAGNITUD = 4;
const PERU = { minLat: -18.5, maxLat: 0, minLon: -81.5, maxLon: -68.5 };

const RANGOS_MAGNITUD = [
  { etiqueta: "4.0 – 4.4", min: 4.0, max: 4.5 },
  { etiqueta: "4.5 – 4.9", min: 4.5, max: 5.0 },
  { etiqueta: "5.0 – 5.4", min: 5.0, max: 5.5 },
  { etiqueta: "5.5 – 5.9", min: 5.5, max: 6.0 },
  { etiqueta: "6.0 o más", min: 6.0, max: Infinity },
];

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

let graficoLinea = null;
let graficoBarras = null;
let capaMarcadores = null;

document.addEventListener("DOMContentLoaded", () => {
  inicializarMapa();
  registrarFiltros();
  cargarDatos(30);
});

function inicializarMapa() {
  const mapa = L.map("mapa").setView([-9.2, -75.0], 5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(mapa);
  capaMarcadores = L.layerGroup().addTo(mapa);
}

function registrarFiltros() {
  const botones = document.querySelectorAll("#filtros button");
  botones.forEach((boton) => {
    boton.addEventListener("click", () => {
      botones.forEach((b) => b.classList.remove("activo"));
      boton.classList.add("activo");
      cargarDatos(Number(boton.dataset.dias));
    });
  });
}

function construirUrl(dias) {
  const fin = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  const aIso = (fecha) => fecha.toISOString().split("T")[0];
  const params = new URLSearchParams({
    format: "geojson",
    starttime: aIso(inicio),
    endtime: aIso(fin),
    minlatitude: PERU.minLat,
    maxlatitude: PERU.maxLat,
    minlongitude: PERU.minLon,
    maxlongitude: PERU.maxLon,
    minmagnitude: MIN_MAGNITUD,
    orderby: "time",
  });
  return `${API_URL}?${params.toString()}`;
}

async function obtenerSismos(dias) {
  const respuesta = await fetch(construirUrl(dias));
  if (!respuesta.ok) {
    throw new Error(`El servicio respondió con el código ${respuesta.status}`);
  }
  const datos = await respuesta.json();
  return datos.features
    .map((f) => ({
      id: f.id,
      magnitud: f.properties.mag,
      lugar: f.properties.place || "Sin referencia",
      tiempo: f.properties.time,
      url: f.properties.url,
      longitud: f.geometry.coordinates[0],
      latitud: f.geometry.coordinates[1],
      profundidad: f.geometry.coordinates[2],
    }))
    .filter(
      (s) =>
        s.magnitud !== null &&
        s.lugar.includes("Peru")
    );
}

function calcularEstadisticas(sismos) {
  const total = sismos.length;
  const sumaMag = sismos.reduce((acc, s) => acc + s.magnitud, 0);
  const sumaProf = sismos.reduce((acc, s) => acc + s.profundidad, 0);
  const masFuerte = sismos.reduce(
    (max, s) => (s.magnitud > max.magnitud ? s : max),
    sismos[0]
  );
  return {
    total,
    magnitudPromedio: total ? sumaMag / total : 0,
    profundidadPromedio: total ? sumaProf / total : 0,
    masFuerte: masFuerte || null,
  };
}

function colorPorMagnitud(mag) {
  if (mag >= 6) return "#ef4444";
  if (mag >= 5.5) return "#f97316";
  if (mag >= 4.5) return "#eab308";
  return "#22c55e";
}

function claseCssMagnitud(mag) {
  if (mag >= 6) return "mag-rojo";
  if (mag >= 5.5) return "mag-naranja";
  if (mag >= 4.5) return "mag-amarillo";
  return "mag-verde";
}

function renderizarKpis(stats) {
  document.getElementById("kpi-total").textContent = stats.total;
  document.getElementById("kpi-promedio").textContent =
    stats.magnitudPromedio.toFixed(1);

  const kpiMaximo = document.getElementById("kpi-maximo");
  const kpiMaximoLugar = document.getElementById("kpi-maximo-lugar");
  if (stats.masFuerte) {
    kpiMaximo.textContent = `M ${stats.masFuerte.magnitud.toFixed(1)}`;
    kpiMaximoLugar.textContent = stats.masFuerte.lugar.replace(", Peru", "");
  } else {
    kpiMaximo.textContent = "—";
    kpiMaximoLugar.textContent = "Sismo más fuerte";
  }

  document.getElementById("kpi-profundidad").textContent = `${stats.profundidadPromedio.toFixed(0)} km`;
}

function contarSismosPorDia(sismos) {
  const conteo = new Map();
  sismos.forEach((s) => {
    const clave = new Date(s.tiempo).toISOString().split("T")[0];
    conteo.set(clave, (conteo.get(clave) || 0) + 1);
  });
  return [...conteo.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([clave, valor]) => ({
      etiqueta: new Date(`${clave}T12:00:00`).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
      }),
      valor,
    }));
}

function contarSismosPorMagnitud(sismos) {
  return RANGOS_MAGNITUD.map((rango) => ({
    etiqueta: rango.etiqueta,
    valor: sismos.filter(
      (s) => s.magnitud >= rango.min && s.magnitud < rango.max
    ).length,
  }));
}

function crearGraficoBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: "#8fa0bd" },
        grid: { color: "rgba(35, 48, 74, 0.4)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#8fa0bd", precision: 0 },
        grid: { color: "rgba(35, 48, 74, 0.4)" },
      },
    },
  };
}

function renderizarGraficos(sismos) {
  const ctxLinea = document.getElementById("grafico-linea");
  const ctxBarras = document.getElementById("grafico-barras");

  if (graficoLinea) graficoLinea.destroy();
  if (graficoBarras) graficoBarras.destroy();

  const porDia = contarSismosPorDia(sismos);
  graficoLinea = new Chart(ctxLinea, {
    type: "line",
    data: {
      labels: porDia.map((d) => d.etiqueta),
      datasets: [
        {
          label: "Sismos",
          data: porDia.map((d) => d.valor),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#ef4444",
        },
      ],
    },
    options: crearGraficoBase(),
  });

  const porMagnitud = contarSismosPorMagnitud(sismos);
  const coloresRangos = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#b91c1c"];
  graficoBarras = new Chart(ctxBarras, {
    type: "bar",
    data: {
      labels: porMagnitud.map((d) => d.etiqueta),
      datasets: [
        {
          label: "Sismos",
          data: porMagnitud.map((d) => d.valor),
          backgroundColor: coloresRangos,
          borderRadius: 8,
        },
      ],
    },
    options: crearGraficoBase(),
  });
}

function renderizarMapa(sismos) {
  capaMarcadores.clearLayers();
  sismos.forEach((s) => {
    L.circleMarker([s.latitud, s.longitud], {
      radius: Math.max(5, s.magnitud * 2.2),
      color: colorPorMagnitud(s.magnitud),
      fillColor: colorPorMagnitud(s.magnitud),
      fillOpacity: 0.45,
      weight: 2,
    })
      .bindPopup(
        `<strong>M ${s.magnitud.toFixed(1)}</strong><br/>` +
          `${s.lugar}<br/>` +
          `${formatoFecha.format(new Date(s.tiempo))}<br/>` +
          `Profundidad: ${s.profundidad.toFixed(0)} km`
      )
      .addTo(capaMarcadores);
  });
}

function renderizarTabla(sismos) {
  const cuerpo = document.getElementById("tabla-cuerpo");
  cuerpo.innerHTML = "";
  sismos.forEach((s) => {
    const fila = document.createElement("tr");

    const celdaFecha = document.createElement("td");
    celdaFecha.textContent = formatoFecha.format(new Date(s.tiempo));

    const celdaLugar = document.createElement("td");
    celdaLugar.textContent = s.lugar;

    const celdaMag = document.createElement("td");
    const insignia = document.createElement("span");
    insignia.className = `celda-mag ${claseCssMagnitud(s.magnitud)}`;
    insignia.textContent = s.magnitud.toFixed(1);
    celdaMag.appendChild(insignia);

    const celdaProf = document.createElement("td");
    celdaProf.textContent = `${s.profundidad.toFixed(0)} km`;

    fila.append(celdaFecha, celdaLugar, celdaMag, celdaProf);
    cuerpo.appendChild(fila);
  });
}

function mostrarCargando(visible) {
  document.getElementById("cargando").hidden = !visible;
}

function mostrarError(mensaje) {
  const elemento = document.getElementById("mensaje-error");
  elemento.textContent = mensaje;
  elemento.hidden = false;
}

function ocultarError() {
  document.getElementById("mensaje-error").hidden = true;
}

async function cargarDatos(dias) {
  mostrarCargando(true);
  ocultarError();
  try {
    const sismos = await obtenerSismos(dias);
    if (sismos.length === 0) {
      throw new Error("No se registraron sismos en el periodo seleccionado.");
    }
    const stats = calcularEstadisticas(sismos);
    renderizarKpis(stats);
    renderizarGraficos(sismos);
    renderizarMapa(sismos);
    renderizarTabla(sismos);
  } catch (error) {
    mostrarError(
      `⚠️ No se pudieron cargar los datos sísmicos. ${error.message}`
    );
  } finally {
    mostrarCargando(false);
  }
}
