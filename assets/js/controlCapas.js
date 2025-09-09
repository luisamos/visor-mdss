import { colores, direccionServicioWFS, proyeccion3857, formatoGeoJson, formatoTexto, fechaHoy, buscarCapaId } from './configuracion';
import ImageWMS from 'ol/source/ImageWMS';
import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Stroke } from 'ol/style';

const legendDiv = document.getElementById("legenda"),
    dropdownItems = document.querySelectorAll('.dropdown-item'),
    checkboxes = document.querySelectorAll('.form-check-input'),
    mensajeBuscarLotes = document.getElementById('mensajeBuscarLotes'),
    buscarLotes = document.getElementById("buscarLotes"),
    estilo = new Style({ stroke: new Stroke({ color: 'red', width: 2, }), }),
    contenido = document.getElementById('popup-content');

legendDiv.innerHTML = '<strong>Leyenda</strong>';
legendDiv.innerHTML += colores[0].texto;
legendDiv.innerHTML += colores[2].texto;

function actualizarLeyenda() {
    legendDiv.innerHTML = '<strong>Leyenda</strong>';
    global.mapa.getLayers().forEach((layer) => {
        if (layer.getVisible()) {
            const color = colores.find((c) => c.id === layer.get('id'));
            if (color) legendDiv.innerHTML += color.texto;
        }
    });
}

function activarBoton(id, estado) {
    const button = document.getElementById('btn' + id);
    if (button !== undefined) {
        if (estado) button.style.display = '';
        else button.style.display = 'none';
    }
}

document.getElementById('capasBase').addEventListener('click', function (e) {
    if (e.target && e.target.type === 'radio') {
        const id = e.target.id;
        if (id === 'osm') {
            global.osm.setVisible(true);
            global.sector041011.setVisible(false);
        }
        else if (id === 'sector041011') {
            global.osm.setVisible(false);
            global.sector041011.setVisible(true);
        }
    }
});

checkboxes.forEach(checkbox => {
    checkbox.addEventListener('click', function () {
        if (this.id !== 'conFichaLotes' &&
            this.id !== 'sinFichaLotes') {
            //console.log(this.id);
            const capaTematica = buscarCapaId(this.id);
            if (capaTematica != null &&
                this.id !== 'habilitacionesUrbanas' &&
                this.id !== 'puertas' &&
                this.id !== 'areasInvadidas' &&
                this.id !== 'parques') {
                activarBoton(this.id, this.checked);
            }
            capaTematica.setVisible(this.checked);
            actualizarLeyenda();
        }
    });
});

dropdownItems.forEach(item => {
    item.addEventListener('click', function (event) {
        event.preventDefault();
        const nombre = item.getAttribute('data-name').toString();
        if (nombre.substring(0, 1) === 'i') {
            global.activoInformacion = nombre.substring(1);
        }
        else if (nombre === 'blotes') {
            document.getElementById('tipoColumna').value = 'nume_doc';
            document.getElementById('valorColumna').value = '';
            mensajeBuscarLotes.innerHTML = '';
            //buscarLotes.setAttribute('data-bs-dismiss', '');
        }
        else if (nombre.substring(0, 1) === 'd') {
            const url = direccionServicioWFS + 'service=WFS&request=GetFeature&VERSION=1.1.0&outputFormat=SHAPE-ZIP&typeName=' + nombre.substring(1);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${nombre.substring(1)}_${fechaHoy()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
});

export function obtenerInformacion(e) {
    const coordenadas = e.coordinate;
    const resolucionVista = /** @type {number} */ (global.vista.getResolution());

    if (activoInformacion == 'lotes') {
        let lotes = buscarCapaId('lotes');
        const source = lotes.getSource();
        if (source instanceof ImageWMS) {
            const url = source.getFeatureInfoUrl(coordenadas, resolucionVista, proyeccion3857, { 'INFO_FORMAT': formatoTexto, 'FEATURE_COUNT': 10 });
            if (url) {
                console.log(url);
                fetch(url)
                    .then(response => response.text())
                    .then(data => {
                        contenido.innerHTML = data;
                        global.cubrir.setPosition(e.coordinate);
                    })
                    .catch(error => console.error('Error al obtener GetFeatureInfo:', error));
            }
        }
    }
}

document.getElementById('filtrarLotes').addEventListener('click', function () {
    let codigo = '',
        conFicha = document.getElementById('conFichaLotes').checked,
        sinFicha = document.getElementById('sinFichaLotes').checked;

    if (conFicha && sinFicha) {
        codigo = '1,2';
    } else {
        if (conFicha) {
            codigo = '1';
        } else if (sinFicha) {
            codigo = '2';
        }
    }
    let lotes = buscarCapaId('lotes');
    if (lotes) {
        const source = lotes.getSource();
        let url = `${source.getUrl()}codigo=${codigo}&`;
        source.setUrl(url);
    }
});

buscarLotes.addEventListener('click', function () {
    let tipoColumna = document.getElementById('tipoColumna').value,
        valorColumna = document.getElementById('valorColumna'),
        parametros = new URLSearchParams({
            SERVICE: 'WFS',
            VERSION: '2.0.0',
            REQUEST: 'GetFeature',
            TYPENAME: 'lotes',
            SRSNAME: proyeccion3857,
            FILTER: `<Filter><PropertyIsEqualTo><PropertyName>${tipoColumna}</PropertyName><Literal>${valorColumna.value}</Literal></PropertyIsEqualTo></Filter>`,
            OUTPUTFORMAT: formatoGeoJson,
        }),
        urlWFS = `${direccionServicioWFS}${parametros.toString()}`;

    if (valorColumna.value.length != 0) {
        try {
            fetch(urlWFS)
                .then(response => response.json())
                .then(data => {
                    let totalRegistros = data.numberMatched;
                    if (totalRegistros > 0) {
                        data.features.forEach(f => {
                            const vectorSource = new VectorSource({ features: new GeoJSON().readFeatures(f.geometry, { featureProjection: proyeccion3857, }), });
                            const vectorLayer = new VectorLayer({ source: vectorSource, style: estilo, id: `${valorColumna.value}` });
                            global.mapa.getLayers().push(vectorLayer);
                            const extension = vectorSource.getExtent();
                            global.mapa.getView().fit(extension, { duration: 1000, maxZoom: 19 });
                        });
                        mensajeBuscarLotes.innerHTML = '';
                        //buscarLotes.setAttribute('data-bs-dismiss', 'modal');
                        //buscarLotes.click();
                    }
                    else {
                        mensajeBuscarLotes.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se encontró ningun registro.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
                        valorColumna.focus();
                    }
                })
                .catch(error => console.log("Error al obtener los datos WFS:", error));
        } catch (error) { console.error('Error WFS:', error); }
    }
    else {
        mensajeBuscarLotes.innerHTML = `<div class="alert alert-sm alert-warning alert-dismissible fade show" role="alert"><strong>Error!</strong> Ingresar un campo.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
        valorColumna.focus();
    }
});