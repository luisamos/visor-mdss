import JSZip from 'jszip';
import shp from 'shpjs';
//import { fileTypeFromBuffer } from 'file-type';
import sanitize from 'sanitize-filename';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import { proyeccion3857, mensaje, generarIdUnico, buscarCapaPorNombre } from './configuracion';
import Pickr from '@simonwep/pickr';

const subirArchivo = document.getElementById('subirArchivo'),
    limpiarArchivo = document.getElementById('limpiarArchivo'),
    archivoZipKml = document.getElementById('archivoZipKmlKmz'),
    leyendDiv = document.getElementById("divLeyendas");

global.vectorLayer = null;

let hexColor = '#FF0000';
const pickr = Pickr.create({
    el: '#colorPicker',
    theme: 'classic',
    default: '#ff0000',
    components: {
        preview: true,
        opacity: false,
        hue: true,
        interaction: {
            hex: true,
            rgba: false,
            input: true,
            save: true
        }
    },
    i18n: {
        'ui:dialog': 'color picker dialog',
        'btn:toggle': 'toggle color picker dialog',
        'btn:swatch': 'color swatch',
        'btn:last-color': 'use previous color',
        'btn:save': 'Guardar',
        'btn:cancel': 'Cancelar',
        'btn:clear': 'Limpiar',

        // Strings used for aria-labels
        'aria:btn:save': 'save and close',
        'aria:btn:cancel': 'cancel and close',
        'aria:btn:clear': 'clear and close',
        'aria:input': 'color input field',
        'aria:palette': 'color selection area',
        'aria:hue': 'hue selection slider',
        'aria:opacity': 'selection slider'
    }
});

pickr.on('save', (color) => {
    hexColor = color.toHEXA().toString();
    pickr.hide();
});

function archivoZipFile2(file) {
    const nombreLimpio = file.name.normalize("NFC").replace(/[^\w.\- ]/gi, '_');
    const r = new FileReader();
    r.onload = function () {
        if (r.readyState !== 2 || r.error) return;
        else convertirCapaShp(r.result, nombreLimpio);
    };
    r.readAsArrayBuffer(file);
}

async function archivoKmlKmzFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    const r = new FileReader();
    r.onload = async function () {
        if (r.readyState !== 2 || r.error) return;

        if (extension === 'kml') {
            convertirCapaKml(r.result, file.name);
        } else if (extension === 'kmz') {
            try {
                const zip = await JSZip.loadAsync(r.result);
                const kmlFile = zip.file(/\.kml$/i)[0];

                if (!kmlFile) {
                    mensaje('mensajeCargar', 'El KMZ no contiene un archivo KML válido.', 'danger');
                    return;
                }

                const kmlText = await kmlFile.async('text');
                convertirCapaKml(kmlText, file.name);
            } catch (err) {
                console.error(err);
                mensaje('mensajeCargar', 'Error al leer el archivo KMZ.', 'danger');
            }
        }
    };

    if (extension === 'kml') {
        r.readAsText(file);
    } else if (extension === 'kmz') {
        r.readAsArrayBuffer(file);
    }
}

function convertirCapaShp2(buffer, nombreShp) {
    shp(buffer).then(function (geojson) {
        const formatoGeoJson = new GeoJSON();
        const features = formatoGeoJson.readFeatures(JSON.stringify(geojson), {
            featureProjection: proyeccion3857
        });
        const capaId = generarIdUnico('SHP');
        agregarCapa(features, capaId, nombreShp, 1);
    });
}

function convertirCapaKml(data, nombreKml) {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(data, 'text/xml');
    const formatoKml = new KML();
    const features = formatoKml.readFeatures(kmlDoc, {
        featureProjection: proyeccion3857
    });
    const capaId = generarIdUnico('KML');
    agregarCapa(features, capaId, nombreKml, 2);
}

function agregarCapa(feature, capaId, capaNombre, tipo) {
    const colorAsignado = hexColor;
    const vectorSource = new VectorSource({
        features: feature,
    });
    global.vectorLayer = new VectorLayer({
        source: vectorSource,
        properties: {
            name: capaId,
            id: capaId,
            title: capaNombre
        },
        style: function (feature) {
            const geometry = feature.getGeometry();
            const geometryType = geometry.getType();
            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                return new Style({
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: colorAsignado }),
                        stroke: new Stroke({ color: 'white', width: 2 })
                    })
                });
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                return new Style({
                    stroke: new Stroke({
                        color: colorAsignado,
                        width: 1
                    })
                });
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                return new Style({
                    stroke: new Stroke({
                        color: colorAsignado,
                        width: 1
                    }),
                    fill: new Fill({
                        color: 'rgba(100, 100, 100, 0.25)'
                    })
                });
            }
            else if (geometryType === 'GeometryCollection') {
                const geometries = geometry.getGeometries();
                for (let g of geometries) {
                    if (g.getType() === 'Point') {
                        return new Style({
                            image: new CircleStyle({
                                radius: 6,
                                fill: new Fill({ color: colorAsignado }),
                                stroke: new Stroke({ color: 'white', width: 2 })
                            })
                        });
                    }
                }
            }
        }
    });

    global.mapa.addLayer(global.vectorLayer);
    //actualizarListaCapas(capaId, capaNombre, tipo, global.vectorLayer);

    const extension = vectorSource.getExtent();
    global.vista.fit(extension, {
        size: global.mapa.getSize(),
        maxZoom: global.vista.getMaxZoom() - 1,
    });
    document.getElementById('subirArchivo').value = '';
}

function actualizarListaCapas(capaId, capaNombre, tipo, capa) {
    const nombreLimpiado = decodeURIComponent(capaNombre.replace(/\+/g, ' '));
    const container = document.getElementById("divCapasServicios");
    if (!container) return;

    let grupoArchivos = container.querySelector('li[data-grupo="archivos-cargados"]');
    if (!grupoArchivos) {
        grupoArchivos = document.createElement("li");
        grupoArchivos.setAttribute('data-grupo', 'archivos-cargados');
        grupoArchivos.innerHTML = `
            <details open>
                <summary>
                    <span><i class="fi fi-rr-folder"></i> Archivos Cargados</span>
                </summary>
                <div class="contenido">
                    <ul id="lista-archivos-cargados"></ul>
                </div>
            </details>
        `;
        container.querySelector(".tree").appendChild(grupoArchivos);
    }

    const listaArchivos = grupoArchivos.querySelector("#lista-archivos-cargados");
    const nuevaCapa = document.createElement("li");
    nuevaCapa.className = "nodo-capa";
    nuevaCapa.setAttribute('data-id', capaId);
    nuevaCapa.setAttribute('data-servicio', '2');
    nuevaCapa.setAttribute('data-tipo', tipo.toString());
    nuevaCapa.innerHTML = `
        <div class="opciones">
            <label class="switch">
                <input type="checkbox" id="${capaId}" checked>
                <span class="slider"></span>
            </label>
            <span>${nombreLimpiado}</span>
            <button class="menu-btn">⋮</button>
            <div class="menu-dropdown">
                <ul>
                    <li class="menu-item"><i class="fi fi-rr-info"></i>Identificar</li>
                    <li class="menu-item"><i class="fi fi-rr-trash"></i>Eliminar</li>
                </ul>
            </div>
        </div>
    `;

    const checkbox = nuevaCapa.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', function (e) {
        capa.setVisible(e.target.checked);
        let img = document.getElementById(`l_${e.target.id}`);
        manejarLeyendaLocal(capa, img, e.target.checked);
    });

    checkbox.checked = capa.getVisible();
    manejarLeyendaLocal(capa, null, true);

    const menuBtn = nuevaCapa.querySelector('.menu-btn');
    menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const dropdown = this.nextElementSibling;
        toggleDropdown(dropdown);
    });

    nuevaCapa.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function () {
            const action = this.textContent.trim();
            if (action === 'Identificar') {
                global.activoInformacion = capaId;
            } else if (action === 'Eliminar') {
                eliminarCapaCargada(capaId, nuevaCapa);
            }
            toggleDropdown(this.closest('.menu-dropdown'));
        });
    });

    listaArchivos.appendChild(nuevaCapa);
}

function toggleDropdown(dropdown) {
    document.querySelectorAll(".menu-dropdown").forEach(menu => {
        if (menu !== dropdown) menu.style.display = "none";
    });
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function eliminarCapaCargada(capaId, elementoDOM) {
    let capa = buscarCapaPorNombre(capaId);
    if (capa) {
        global.mapa.removeLayer(capa);
    }

    const leyendaElemento = document.getElementById(`l_${capaId}`);
    if (leyendaElemento) {
        leyendaElemento.remove();
    }

    elementoDOM.remove();

    const listaArchivos = document.getElementById("lista-archivos-cargados");
    if (listaArchivos && listaArchivos.children.length === 0) {
        const grupoArchivos = document.querySelector('li[data-grupo="archivos-cargados"]');
        if (grupoArchivos) grupoArchivos.remove();
    }
}

function getEstiloCapa(capa) {
    const feature = capa.getSource().getFeatures()[0];
    const styleFunction = capa.getStyle();
    const style = styleFunction(feature);
    const actualStyle = Array.isArray(style) ? style[0] : style;

    const geometryType = feature.getGeometry().getType();
    const title = capa.get('title') || 'Sin título';

    const estilo = {
        tipo: geometryType,
        title,
        radius: null,
        color: null,
        stroke: null,
        width: null,
        fill: null
    };

    const stroke = actualStyle.getStroke();
    if (stroke) {
        estilo.stroke = stroke.getColor();
        estilo.width = stroke.getWidth();
        estilo.color = stroke.getColor();
    }

    const fill = actualStyle.getFill();
    if (fill) {
        estilo.fill = fill.getColor();
    }

    const image = actualStyle.getImage();
    if (image && image.getRadius) {
        estilo.radius = image.getRadius();
        estilo.color = image.getFill()?.getColor();
        estilo.stroke = image.getStroke()?.getColor();
    }

    return estilo;
}

function generarLeyenda(capa) {
    const style = getEstiloCapa(capa);
    let legendHTML = '';

    switch (style.tipo.toLowerCase()) {
        case 'point':
            legendHTML = `
        <div class="legend-element">
          <svg width="20" height="20">
            <circle cx="10" cy="10" r="${style.radius}"
                    fill="${style.color}"
                    stroke="${style.stroke}"
                    stroke-width="2"/>
          </svg>
          <span>${style.title}</span>
        </div>
      `;
            break;

        case 'linestring':
            legendHTML = `
        <div class="legend-element">
          <div class="legend-line"
               style="background:${style.color};
                      height:${style.width}px">
          </div>
          <span>${style.title}</span>
        </div>
      `;
            break;

        case 'polygon':
        case 'multipolygon':
            legendHTML = `
        <div class="legend-element">
          <div class="legend-polygon"
               style="background:${style.fill};
                      border: 2px solid ${style.stroke}">
          </div>
          <span>${style.title}</span>
        </div>
      `;
            break;

        default:
            legendHTML = `<span>Tipo no soportado: ${style.tipo}</span>`;
    }
    return legendHTML;
}

function manejarLeyendaLocal(capa, img, visible) {
    const container = document.createElement('div');
    container.className = 'legend-item';
    const legendHTML = generarLeyenda(capa);
    container.innerHTML = legendHTML;

    if (!img) {
        img = document.createElement('div');
        const id = capa.get('name');
        img.id = `l_${id}`;
        img.className = 'legend-container';
        img.appendChild(container);
        leyendDiv.appendChild(img);
    }

    if (visible) {
        img.classList.remove('oculto');
    }
    else img.classList.add('oculto');
}

subirArchivo.addEventListener('click', function () {
    const files = archivoZipKml.files;
    if (files && files.length > 0) {
        const file = files[0];
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension === 'zip') {
            archivoZipFile(file);
        } else if (extension === 'kml' || extension === 'kmz') {
            archivoKmlKmzFile(file);
        } else {
            mensaje('mensajeCargar', 'Formato de archivo no soportado', 'danger');
        }
    }
});

limpiarArchivo.addEventListener('click', function () {
    archivoZipKml.value = '';
    limpiarArchivo.classList.add('disabled');
    if (global.vectorLayer != null) {
        global.mapa.getLayers().remove(global.vectorLayer);
        global.vectorLayer = null;
    }
});

export async function archivoZipFile(file) {
    try {
        // Validación básica
        if (!file || !(file instanceof File)) {
            throw new Error('Archivo no válido');
        }

        // Leer el archivo
        const buffer = await file.arrayBuffer();

        // Cargar ZIP
        const zip = await JSZip.loadAsync(buffer);

        // Buscar archivos SHP
        const shpFiles = [];
        const fileNames = Object.keys(zip.files);

        // 1. Encontrar todos los .shp
        const shpEntries = fileNames.filter(name =>
            name.toLowerCase().endsWith('.shp')
        );

        // 2. Para cada .shp encontrado, buscar sus complementarios
        for (const shpPath of shpEntries) {
            const baseName = shpPath.replace(/\.shp$/i, '');
            const requiredFiles = {
                shp: false,
                shx: false,
                dbf: false
            };

            // Verificar archivos correspondientes
            for (const fileName of fileNames) {
                const lowerName = fileName.toLowerCase();
                if (lowerName === `${baseName.toLowerCase()}.shp`) requiredFiles.shp = true;
                if (lowerName === `${baseName.toLowerCase()}.shx`) requiredFiles.shx = true;
                if (lowerName === `${baseName.toLowerCase()}.dbf`) requiredFiles.dbf = true;
            }

            // Si encontramos un set completo
            if (requiredFiles.shp && requiredFiles.shx && requiredFiles.dbf) {
                shpFiles.push({
                    baseName,
                    shp: `${baseName}.shp`,
                    shx: `${baseName}.shx`,
                    dbf: `${baseName}.dbf`
                });
            }
        }

        // Validación final
        if (shpFiles.length === 0) {
            const missing = [];
            if (!shpEntries.length) missing.push('.shp');

            // Análisis más detallado de lo que falta
            const sampleShp = shpEntries[0];
            if (sampleShp) {
                const base = sampleShp.replace(/\.shp$/i, '');
                const hasShx = fileNames.some(n => n.toLowerCase() === `${base.toLowerCase()}.shx`);
                const hasDbf = fileNames.some(n => n.toLowerCase() === `${base.toLowerCase()}.dbf`);

                if (!hasShx) missing.push('.shx');
                if (!hasDbf) missing.push('.dbf');
            }

            throw new Error(missing.length ?
                `Faltan archivos requeridos: ${missing.join(', ')}` :
                'No se encontró ningún archivo .shp válido');
        }

        // Si llegamos aquí, tenemos shapefiles válidos
        const nombreLimpio = sanitize(file.name.replace(/\.[^/.]+$/, ""));
        //await convertirCapaShp(buffer, nombreLimpio);
        await procesarConTimeout(() => convertirCapaShp(buffer, nombreLimpio), 30000);

    } catch (error) {
        console.error('Error procesando SHP:', {
            error: error.message,
            file: file?.name,
            stack: error.stack
        });
        mensaje('mensajeCargar', `Error: ${error.message}`, 'danger');
        throw error;
    }
}

async function procesarConTimeout(fn, ms) {
    let timeout;
    const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Tiempo excedido (${ms / 1000}s)`)), ms);
    });

    try {
        return await Promise.race([
            fn(),
            timeoutPromise
        ]);
    } finally {
        clearTimeout(timeout);
    }
}

async function convertirCapaShp(buffer, nombreShp) {
    try {
        const geojson = await shp(buffer);
        const formatoGeoJson = new GeoJSON();
        const features = formatoGeoJson.readFeatures(JSON.stringify(geojson), {
            featureProjection: proyeccion3857
        });
        const capaId = generarIdUnico('SHP');
        agregarCapa(features, capaId, nombreShp, 1);
    } catch (error) {
        console.error('Error convirtiendo SHP:', error);
        throw new Error('El archivo Shapefile está corrupto o es inválido');
    }
}