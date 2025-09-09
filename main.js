import './style.css';
import 'bootstrap';

import Map from 'ol/Map';
import View from 'ol/View';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import { OverviewMap, defaults as defaultControls } from 'ol/control';
import Overlay from 'ol/Overlay';

import { IS_DEV, proyeccion3857, centroide3857 } from './assets/js/configuracion';
import { capasGeograficas } from './assets/js/capasGeograficas';

const hoy = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

if (IS_DEV) {
  console.log(
    `%c🔴 [Desarrollo] MDSS | Visor (${hoy}) - versión [2.1.3]`,
    'color: white; background-color: #4CAF50; font-size: 14px; padding: 6px 10px; border-radius: 4px;'
  );
}
else {
  console.log(
    `%c⚫ MDSS | Visor (${hoy})`,
    'color: white; background-color: #4CAF50; font-size: 14px; padding: 6px 10px; border-radius: 4px;'
  );
}

global.activoInformacion = "";
global.ResolucionPantalla = window.innerWidth <= 1366;

// 0. Configuración global
global.cubrir = new Overlay({ element: document.getElementById('popup'), autoPan: { animation: { duration: 250, }, }, });
const overviewMapControl = new OverviewMap({ className: 'ol-overviewmap', tipLabel: ' ', layers: [new TileLayer({ source: new OSM(), }),], collapseLabel: '\u00BB', label: '\u00AB', collapsed: ResolucionPantalla, });
const controles = defaultControls({ zoom: false, attribution: false, rotate: true }).extend([overviewMapControl]);
global.vista = new View({ projection: proyeccion3857, center: centroide3857, zoom: 14 });
global.mapa = new Map({ target: 'map', layers: capasGeograficas, view: global.vista, controls: controles, overlays: [cubrir], });
window.addEventListener('resize', () => { global.mapa.updateSize(); });

// 1. Barra de controles
import './assets/js/barraControles';

// 2. Control de las capas y control Propiedades (Gráfico, identificar, filtro, descargar)
import { obtenerInformacion } from './assets/js/controlCapas';
global.mapa.on('singleclick', function (e) { obtenerInformacion(e); });
const cerrar = document.getElementById('popup-closer');
cerrar.onclick = function () {
  global.cubrir.setPosition(undefined); cerrar.blur(); return false;
};

// 3. Mouse posición y escala
import { mousePosicion, actualizarEscala } from './assets/js/controlMousePosicionEscala';
global.mapa.on('pointermove', mousePosicion);
global.mapa.getView().on('change:resolution', actualizarEscala);
global.mapa.once('rendercomplete', function () { actualizarEscala(); });

// 4. Control inicio
import './assets/js/controlVistaInicioMasMenos';

// 5. Control cargar archivos de tipo ShapeFile
import './assets/js/controlCargarArchivoLocal';

// 6. Control graficar sobre el mapa
import './assets/js/controlGraficar';

// 7. Control cargar servicios web
import './assets/js/controlCargarServiciosWeb';

// 8. Control ubicar coordenadas
import './assets/js/controlUbicarCoordenadas';

// 9. Control obtener coordenadas
/*import { obtenerCoordenadas } from './assets/js/controlObtenerCoordenadas';
global.mapa.on('click', function (e) {
  global.activoInformacion = "";
  obtenerCoordenadas(e);
});*/

// 10. Control calcular distancia y superficie
import './assets/js/controlCalcularDistanciaSuperficie';