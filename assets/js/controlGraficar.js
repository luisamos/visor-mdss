import { Draw } from "ol/interaction";
import { GeoJSON } from "ol/format";
import { Point, LineString, Polygon } from "ol/geom";
import { saveAs } from "file-saver";
import proj4 from "proj4";
import {
  fechaHoy,
  proyeccion3857,
  proyeccion32719,
  mensaje,
  fuente,
  estilosDibujo,
} from "./configuracion";

global.dibujo = null;
const radios = document.querySelectorAll("input[name='btnradio']"),
  descargarDibujo = document.getElementById("descargarDibujo"),
  limpiarDibujo = document.getElementById("limpiarDibujo");

function agregarInteraccion(tipoGeometria) {
  const vectorSource = global.dibujoGeometria.getSource();
  vectorSource.clear();
  const tipo = tipoGeometria;
  if (tipo !== "None") {
    dibujo = new Draw({
      source: fuente,
      type: tipo,
      style: estilosDibujo[tipo],
    });
    global.mapa.addInteraction(dibujo);
  }
}

radios.forEach((radio) => {
  radio.addEventListener("change", () => {
    const seleccionado = document.querySelector(
      "input[name='btnradio']:checked"
    ).id;

    if (dibujo != null) {
      global.mapa.removeInteraction(dibujo);
    }

    if (seleccionado !== "None") {
      limpiarDibujo.classList.remove("disabled");
    } else {
      limpiarDibujo.classList.add("disabled");
    }

    agregarInteraccion(seleccionado);
  });
});

descargarDibujo.addEventListener("click", function () {
  const vectorSource = global.dibujoGeometria.getSource();
  const features = vectorSource.getFeatures();
  let nombre;

  if (features.length > 0) {
    features.forEach((feature) => {
      const geometry = feature.getGeometry();
      let coordinates = geometry.getCoordinates(),
        transformedCoordinates;

      nombre = geometry.getType();

      switch (nombre) {
        case "Point":
          transformedCoordinates = proj4(
            proyeccion3857,
            proyeccion32719,
            coordinates
          );
          feature.setGeometry(new Point(transformedCoordinates));
          break;

        case "LineString":
          transformedCoordinates = coordinates.map((coord) =>
            proj4(proyeccion3857, proyeccion32719, coord)
          );
          feature.setGeometry(new LineString(transformedCoordinates));
          break;

        case "Polygon":
          transformedCoordinates = coordinates.map((ring) =>
            ring.map((coord) =>
              proj4(proyeccion3857, proyeccion32719, coord)
            )
          );
          feature.setGeometry(new Polygon(transformedCoordinates));
          break;
        default:
          console.log("Tipo de geometría no soportado:", geometry.getType());
      }
    });

    const geoJSONFormat = new GeoJSON();
    const geoJSONData = geoJSONFormat.writeFeatures(features);
    const blob = new Blob([geoJSONData], { type: "application/json" });
    const nombreArchivo = `${nombre}_${fechaHoy()}.geojson`;
    saveAs(blob, nombreArchivo);
    mensaje(
      "mensajeGraficar",
      `Se descargó correctamente: <strong>'${nombreArchivo}</strong>`,
      "primary"
    );
  } else {
    mensaje(
      "mensajeGraficar",
      "<strong>Error: </strong> No existe registro alguno para la descarga.",
      "danger"
    );
  }
});

limpiarDibujo.addEventListener("click", function () {
  document.getElementById("mensajeGraficar").innerHTML = "";
  document.getElementById("None").checked = true;
  const vectorSource = global.dibujoGeometria.getSource();
  vectorSource.clear();
  global.mapa.removeInteraction(dibujo);
});
