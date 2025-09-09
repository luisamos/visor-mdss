import VectorSource from 'ol/source/Vector';
import { Vector as VectorLayer } from 'ol/layer';
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style';
import { Draw } from 'ol/interaction';
import Overlay from 'ol/Overlay';
import { getLength, getArea } from 'ol/sphere';
import { unByKey } from 'ol/Observable';

let helpTooltipElement,
    helpTooltip,
    measureTooltipElement,
    measureTooltip,
    draw,
    listener;

const radios = document.querySelectorAll('input[name="btnradio2"]'),
    limpiarMedir = document.getElementById('limpiarMedir');

function createVectorLayer() {
    return new VectorLayer({
        name: 'draw',
        source: new VectorSource(),
        style: new Style({
            fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
            stroke: new Stroke({ color: '#0000ff', width: 2 }),
            image: new CircleStyle({
                radius: 7,
                fill: new Fill({ color: '#0000ff' })
            })
        })
    });
}

function createStyle() {
    return new Style({
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 2 }),
        image: new CircleStyle({
            radius: 5,
            stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
            fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' })
        })
    });
}

function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.remove();
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'ol-tooltip hidden';
    helpTooltip = new Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left'
    });
    global.mapa.addOverlay(helpTooltip);
}

function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.remove();
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    measureTooltip = new Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center',
        stopEvent: false,
        insertFirst: false
    });
    global.mapa.addOverlay(measureTooltip);
}

function configurar(type, formatFunction) {
    const vectorLayer = createVectorLayer();
    global.mapa.addLayer(vectorLayer);

    const style = createStyle();

    draw = new Draw({
        source: vectorLayer.getSource(),
        type: type,
        style: (feature) => {
            const geometryType = feature.getGeometry().getType();
            return geometryType === type || geometryType === 'Point' ? style : null;
        }
    });

    global.mapa.addInteraction(draw);
    createMeasureTooltip();
    createHelpTooltip();

    draw.on('drawstart', (evt) => {
        const sketch = evt.feature;

        listener = sketch.getGeometry().on('change', (evt) => {
            const geom = evt.target;
            const output = formatFunction(geom);
            const tooltipCoord = type === 'LineString' ? geom.getLastCoordinate() : geom.getInteriorPoint().getCoordinates();
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
        });
    });

    draw.on('drawend', () => {
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
        measureTooltip.setOffset([0, -7]);
        measureTooltipElement = null;
        createMeasureTooltip(map);
        unByKey(listener);
    });
}

function formatLength(line) {
    const length = getLength(line);
    return length > 1000 ? `${(length / 1000).toFixed(2)} km` : `${length.toFixed(2)} m`;
}

function formatArea(polygon) {
    const area = getArea(polygon);
    const areaKm2 = area / 1000000;
    const areaHa = area / 10000;

    return area > 10000
        ? `${areaKm2.toFixed(2)} km<sup>2</sup> <br>${areaHa.toFixed(2)} ha`
        : `${area.toFixed(2)} m<sup>2</sup>`;
}

function cleanUpDrawInteractions() {
    global.mapa.getInteractions().forEach((interaction) => {
        if (interaction instanceof Draw) {
            global.mapa.removeInteraction(interaction);
        }
    });
}

function limpiarTodo() {

    cleanUpDrawInteractions(map);
    global.mapa.getOverlays().clear();
    global.mapa.getLayers().getArray().forEach(layer => {
        if (layer.get('name') === 'draw') {
            layer.getSource().clear();
        }
    });
}

radios.forEach(radio => {
    radio.addEventListener("change", () => {
        if (radio.checked) {
            cleanUpDrawInteractions();
            if (radio.id === 'medirPerimetro') {
                configurar('LineString', formatLength);
            }
            else configurar('Polygon', formatArea);
        }
    });
});

limpiarMedir.addEventListener('click', () => limpiarTodo());