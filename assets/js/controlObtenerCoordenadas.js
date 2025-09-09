import Overlay from 'ol/Overlay';
import proj4 from 'proj4';
import { proyeccion3857, proyeccion32719, obtenerSRID } from './configuracion';

const btnObtenerCoordenadas = document.getElementById('btnObtenerCoordenadas');

function createPopup() {
    const element_ = document.createElement('div');
    element_.id = 'coord-popup';
    element_.className = 'ol-popup';
    element_.style.minWidth = '50px';

    element_.innerHTML = `
        <a href="#" id="popup-closer" class="ol-popup-closer"></a>
        <div id="popup-content"></div>`;

    const popup = new Overlay({
        element: element_,
        positioning: 'bottom-center',
        stopEvent: true
    });
    global.mapa.addOverlay(popup);

    const closer = element_.querySelector('#popup-closer');
    closer.addEventListener('click', () => {
        element_.style.display = 'none';
    });
    return { popup, element_ };
}

btnObtenerCoordenadas.addEventListener('click', function () {
    this.classList.toggle('active');

    if (!this.classList.contains('active')) {
        //Se puede eliminar los popup al desactivar.
    }
});

export function obtenerCoordenadas(e) {

    const { popup, element_ } = createPopup();
    const projection = document.getElementById('srid'),
        coordenadas = proj4(proyeccion3857, proyeccion32719, e.coordinate),
        [x, y] = coordenadas.map(coord => coord.toFixed(4)),
        texto = `<tr><th>X:</th><td>${x}</td></tr><tr><th>Y:</th><td>${y}</td></tr>`;

    document.getElementById('popup-content').innerHTML = `
        <table>
            <tbody>
                ${texto}
            </tbody>
        </table>`;

    popup.setPosition(e.coordinate);
    element_.style.display = 'block';
}