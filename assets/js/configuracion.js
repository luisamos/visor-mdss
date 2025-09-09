//
// Configuración
//
import * as bootstrap from "bootstrap";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import { Vector as VectorSource } from "ol/source";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import CircleStyle from "ol/style/Circle";
import imagenVerde from "../images/ubicacionVerde.png";
import imagenRojo from "../images/ubicacionRojo.png";

global.activoInformacion;

function direccionWeb() {
  if (IS_DEV) return "http://127.0.0.9";
  else return "http://192.168.101.201:81";
}

let contadorCapas = 0;
export function generarIdUnico(tipo) {
  return `${tipo}${Date.now()}${contadorCapas++}`;
}

export const IS_DEV = true,
  centroide3857 = [-8006739.31529856, -1520718.334818567],
  proyeccion3857 = "EPSG:3857",
  proyeccion4326 = "EPSG:4326",
  proyeccion32717 = "EPSG:32717",
  proyeccion32718 = "EPSG:32718",
  proyeccion32719 = "EPSG:32719",
  direccionServicioWMS = direccionWeb() + "/servicio/wms?",
  direccionServicioWFS = direccionWeb() + "/servicio/wfs?",
  direccionServicioMapCache = direccionWeb() + "/mapcache/?",
  //direccionApiGIS = (IS_DEV) ? 'http://127.0.0.9:5000/' : 'http://209.45.78.210:5000/',
  formatoPNG = "image/png",
  formatoJPEG = "image/jpeg",
  formatoJson = "application/json",
  formatoGeoJson = "geojson",
  formatoTexto = "text/html",
  fuente = new VectorSource({ wrapX: false, projection: proyeccion3857 }),
  colores = [
    {
      id: "provincias",
      texto:
        '<div class="legend-item"><i style="background:#26a69a;"></i> Provincias</div>',
    },
    {
      id: "distritos",
      texto:
        '<div class="legend-item"><i style="background:#26a69a;"></i> Distritos</div>',
    },
    {
      id: "sectores",
      texto:
        '<div class="legend-item"><i style="background:#9900cc;"></i> Sectores</div>',
    },
    {
      id: "manzanas",
      texto:
        '<div class="legend-item"><i style="background:#00ffff;"></i> Manzanas</div>',
    },
    {
      id: "lotes",
      texto: `<div class="legend-item"><strong>Lotes</strong></div>
                        <div class="legend-item2"><i style="background:#646b63;"></i> Con Ficha</div>
                        <div class="legend-item2"><i style="background:#ff6600;"></i> Sin Ficha</div>
                        <div class="legend-item"></div>`,
    },
    {
      id: "habilitacionesUrbanas",
      texto:
        '<div class="legend-item"><i style="background:#0000ff"></i> Habilitaciones Urbanas</div>',
    },
    {
      id: "serviciosBasicos",
      texto: `<div class="legend-item"><strong>Servicios básicos</strong></div>
        <div class="legend-item2"><i style="background:#00aae4"></i> Luz</div>
        <div class="legend-item2"><i style="background:#6ae1ff"></i> Agua</div>
        <div class="legend-item2"><i style="background:#593cc5"></i> Desague</div>
        <div class="legend-item2"><i style="background:#eeeec4"></i> Gas</div>
        <div class="legend-item2"><i style="background:#efeeff"></i> Internet</div>
        <div class="legend-item2"><i style="background:#ff9d44"></i> TvCable</div>
        <div class="legend-item"></div>`,
    },
    {
      id: "clasificacionPredios",
      texto: `<div class="legend-item"><strong>Clasificación de Predios</strong></div>
        <div class="legend-item2"><i style="background:#073763"></i> Casa - Habitación</div>
        <div class="legend-item2"><i style="background:#0b5394"></i> Tienda - Depósito - Almacen</div>
        <div class="legend-item2"><i style="background:#3d85c6"></i> Predios en edificación</div>
        <div class="legend-item2"><i style="background:#9fc5e8"></i> Terreno sin construcción</div>
        <div class="legend-item2"><i style="background:#6fa8dc"></i> Otros</div>
        <div class="legend-item"></div>`,
    },
    {
      id: "tiposPersonas",
      texto: `<div class="legend-item"><strong>Tipos de personas</strong></div>
            <div class="legend-item2"><i style="background:#3bc500"></i> Persona natural</div>
            <div class="legend-item2"><i style="background:#005700"></i> Persona jurídica</div>
            <div class="legend-item"></div>`,
    },
    {
      id: "puertas",
      texto: `<div class="legend-item"><strong>Puertas</strong></div>
                <div class="legend-item2"><i style="background:#000000"></i> P</div>
                <div class="legend-item2"><i style="background:#ff0000"></i> S</div>
                <div class="legend-item2"><i style="background:#ffff00"></i> G</div>
                <div class="legend-item"></div>`,
    },
    {
      id: "areasInvadidas",
      texto:
        '<div class="legend-item"><i style="background:#f44336"></i> Áreas invadidas</div>',
    },
    {
      id: "parques",
      texto:
        '<div class="legend-item"><i style="background:#073763"></i> Parques</div>',
    },
    {
      id: "ejeVias",
      texto:
        '<div class="legend-item"><i style="background:#adadad"></i> Eje de vías</div>',
    },
    {
      id: "predios",
      texto:
        '<div class="legend-item"><i style="background:#9a7051"></i> Predios SBN</div>',
    },
  ],
  estilosDibujo = {
    Point: new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: "red" }),
      }),
    }),
    LineString: new Style({
      stroke: new Stroke({
        color: "yellow",
        width: 2,
      }),
    }),
    Polygon: new Style({
      stroke: new Stroke({
        color: "yellow",
        width: 2,
      }),
      fill: new Fill({
        color: "blue",
      }),
    }),
    Circle: new Style({
      stroke: new Stroke({
        color: "blue",
        width: 2,
      }),
      fill: new Fill({
        color: "yellow",
      }),
    }),
  },
  estiloMarcadorVerde = new Style({
    image: new Icon({
      anchor: [0.2, 20],
      anchorXUnits: "fraction",
      anchorYUnits: "pixels",
      src: imagenVerde,
    }),
  }),
  estiloMarcadorRojo = new Style({
    image: new Icon({
      anchor: [0.2, 20],
      anchorXUnits: "fraction",
      anchorYUnits: "pixels",
      src: imagenRojo,
    }),
  });

export function fechaHoy() {
  const fecha = new Date(),
    dia = String(fecha.getDate()).padStart(2, "0"),
    mes = String(fecha.getMonth() + 1).padStart(2, "0"),
    año = fecha.getFullYear();
  return dia + "" + mes + "" + año;
}

export function mensaje(id, mensaje, tipo) {
  const alertPlaceholder = document.getElementById(id);
  const texto =
    '<div class="alert alert-' +
    tipo +
    ' alert-dismissible py-1 px-2" role="alert">' +
    " <div>" +
    mensaje +
    "</div>" +
    ' <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="alert" aria-label="Close" style="transform: scale(0.8);"></button>' +
    "</div>";
  alertPlaceholder.innerHTML = texto;
}

export function buscarCapaId(id) {
  return (
    global.mapa
      .getLayers()
      .getArray()
      .find((layer) => layer.get("id") === id) || null
  );
}

export function buscarCapaPorNombre(nombre) {
  return global.mapa
    .getLayers()
    .getArray()
    .find((layer) => layer.get("name") === nombre);
}

export function mostrarToast(mensaje, color = "primary") {
  const toastEl = document.getElementById("toastNotificacion");
  const toastBody = toastEl.querySelector(".toast-body");

  toastBody.textContent = mensaje;
  toastEl.className = `toast align-items-center text-white bg-${color} border-0`;

  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

export function obtenerSRID(srid) {
  switch (srid) {
    case "32717":
      return proyeccion32717;
    case "32718":
      return proyeccion32718;
    case "32719":
      return proyeccion32719;
    case "4326":
      return proyeccion4326;
    case "3857":
      return proyeccion3857;
  }
}

export function validarUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function modificarURLServicioWMS(url) {
  if (!/\?/.test(url) || !/(?:[?&])(REQUEST|SERVICE)=/i.test(url)) {
    const parametrosFaltantes = [];

    if (!/(?:[?&])REQUEST=/i.test(url)) {
      parametrosFaltantes.push('REQUEST=GetCapabilities');
    }
    if (!/(?:[?&])SERVICE=/i.test(url)) {
      parametrosFaltantes.push('SERVICE=WMS');
    }

    url += (url.includes('?') ? '&' : '?') + parametrosFaltantes.join('&');
  }
  return url;
}
