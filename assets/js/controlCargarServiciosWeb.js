import {
  formatoPNG,
  modificarURLServicioWMS,
  validarUrl,
  mensaje,
  proyeccion3857,
  centroide3857,
  buscarCapaPorNombre,
} from "./configuracion";
import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import { Toast } from "bootstrap";

const tipoServicioWeb = document.getElementById("tipoServicioWeb"),
  direccionServicioWeb = document.getElementById("direccionServicioWeb"),
  conectarServicioWeb = document.getElementById("conectarServicioWeb"),
  mensajeServicioWeb = document.getElementById("mensajeServicioWeb"),
  capasTematicas = document.getElementById("capasTematicas"),
  capasDisponibles = document.getElementById("capasDisponibles"),
  agregarGrupos = document.getElementById("agregarGrupos"),
  agregarCapas = document.getElementById("agregarCapas"),
  limpiarServicioWeb = document.getElementById("limpiarServicioWeb");

function limpiar() {
  mensajeServicioWeb.innerHTML = "";
  direccionServicioWeb.classList.remove("is-invalid");
  direccionServicioWeb.value = "";
  direccionServicioWeb.focus();
  conectarServicioWeb.classList.remove("disabled");
  conectarServicioWeb.innerHTML =
    '<i class="bi bi-box-arrow-down"></i> Conectar';
  capasDisponibles.style.display = "none";
  agregarGrupos.style.display = "none";
}

limpiarServicioWeb.addEventListener("click", () => {
  direccionServicioWeb.value = "";
  global.vista.setCenter(centroide3857);
  global.vista.setZoom(global.mapa.getSize()[0] > 1296 ? 14 : 13.4);
  limpiar();
});

tipoServicioWeb.addEventListener("change", () => {
  direccionServicioWeb.value = "";
  direccionServicioWeb.focus();
});

conectarServicioWeb.addEventListener("click", () => {
  if (direccionServicioWeb.value.length > 0) {
    conectarServicioWeb.innerHTML =
      '<span class="spinner-grow spinner-grow-sm" aria-hidden="true"></span> Conectando';

    switch (tipoServicioWeb.value) {
      case "wms":
        conectarServicioOGCWMS();
        break;
      case "wfs":
        conectarServicioOGCWFS();
        break;
      case "rest":
        conectarServicioRestArcGIS();
        break;
    }
  } else {
    direccionServicioWeb.classList.add("is-invalid");
    direccionServicioWeb.focus();
    conectarServicioWeb.innerHTML =
      '<i class="bi bi-box-arrow-down"></i> Conectar';
  }
});

function conectarServicioOGCWMS() {
  const urlServicioExternoWMS = modificarURLServicioWMS(
    direccionServicioWeb.value.trim()
  );

  if (validarUrl(urlServicioExternoWMS)) {
    fetch(urlServicioExternoWMS, { mode: "cors" })
      .then((response) => {
        if (!response.ok) throw new Error("La solicitud falló");
        return response.text();
      })
      .then((xmlText) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const grupoCapas = xmlDoc.querySelectorAll('Layer[queryable="1"]');

        capasDisponibles.style.display = "block";
        agregarGrupos.style.display = "block";
        limpiarServicioWeb.classList.remove("disabled");

        grupoCapas.forEach((capa) => {
          const nombre = capa.querySelector("Name").textContent;
          const titulo = capa.querySelector("Title").textContent;

          const option = document.createElement("option");
          option.textContent = titulo;
          option.value = nombre;
          capasTematicas.appendChild(option);
        });
      })
      .catch((error) => {
        mensaje(
          "mensajeServicioWeb",
          `<strong>Error:</strong> ${error}`,
          "danger"
        );
        limpiar();
      });

    mensajeServicioWeb.innerHTML = "";
    conectarServicioWeb.classList.add("disabled");
    direccionServicioWeb.classList.remove("is-invalid");
    conectarServicioWeb.innerHTML =
      '<i class="bi bi-box-arrow-down"></i> Conectar';
    limpiarServicioWeb.classList.remove("disabled");
  } else limpiar();
}

agregarCapas.addEventListener("click", () => {
  if (capasTematicas.options.length > 0) {
    const selectedIndex = capasTematicas.selectedIndex;
    const idCapa = capasTematicas.value;
    const nombreCapa = capasTematicas.options[
      selectedIndex
    ].innerText.substring(0, 25);
    const url = direccionServicioWeb.value;
    const tipo = tipoServicioWeb.value;

    const optionToRemove = capasTematicas.querySelector(
      `option[value="${idCapa}"]`
    );
    if (optionToRemove) optionToRemove.remove();

    if (tipo === "wms") {
      const capaId = `ext_${idCapa}`;
      const capaWMS = new TileLayer({
        source: new TileWMS({
          url: url,
          params: { LAYERS: idCapa, FORMAT: formatoPNG },
          projection: proyeccion3857,
        }),
        visible: true,
        properties: {
          name: capaId,
          title: nombreCapa,
        },
      });
      global.mapa.addLayer(capaWMS);
      actualizarListaServiciosExternos(capaId, nombreCapa, url, "1", capaWMS);
    } else if (tipo === "rest") {
    }
  }
});

function actualizarListaServiciosExternos(id, nombre, url, tipo, capa) {
  const container = document.getElementById("divCapasServicios");
  if (!container) return;

  let grupo = container.querySelector('li[data-grupo="servicios-externos"]');
  if (!grupo) {
    grupo = document.createElement("li");
    grupo.setAttribute("data-grupo", "servicios-externos");
    grupo.innerHTML = `
            <details open>
                <summary><span><i class="fi fi-rr-globe"></i> Servicios Externos</span></summary>
                <div class="contenido">
                    <ul id="lista-servicios-externos"></ul>
                </div>
            </details>
        `;
    container.querySelector(".tree").appendChild(grupo);
  }

  const lista = grupo.querySelector("#lista-servicios-externos");
  const item = document.createElement("li");
  item.className = "nodo-capa";
  item.setAttribute("data-id", id);
  item.setAttribute("data-servicio", "1");
  item.setAttribute("data-tipo", tipo);
  item.setAttribute("data-url", url);
  item.setAttribute("data-nombre", nombre);

  item.innerHTML = `
        <div class="opciones">
            <label class="switch">
                <input type="checkbox" id="${id}" checked>
                <span class="slider"></span>
            </label>
            <span>${escapeHTML(nombre)}</span>
            <button class="menu-btn">⋮</button>
            <div class="menu-dropdown">
                <ul>
                    <li class="menu-item"><i class="fi fi-rr-info"></i>Identificar</li>
                    <li class="menu-item"><i class="fi fi-rr-trash"></i>Eliminar</li>
                </ul>
            </div>
        </div>
    `;

  item
    .querySelector('input[type="checkbox"]')
    .addEventListener("change", function (e) {
      capa.setVisible(e.target.checked);
    });

  item.querySelector(".menu-btn").addEventListener("click", function (e) {
    e.stopPropagation();
    toggleDropdown(this.nextElementSibling);
  });

  item.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", function () {
      const action = this.textContent.trim();
      if (action === "Identificar") {
        global.activoInformacion = id;
      } else if (action === "Eliminar") {
        eliminarServicioExterno(id, item);
      }
      toggleDropdown(this.closest(".menu-dropdown"));
    });
  });

  lista.appendChild(item);
}

function eliminarServicioExterno(id, elementoDOM) {
  let capa = buscarCapaPorNombre(id);
  if (capa) {
    global.mapa.removeLayer(capa);
  }
  elementoDOM.remove();

  const lista = document.getElementById("lista-servicios-externos");
  if (lista && lista.children.length === 0) {
    const grupo = document.querySelector('li[data-grupo="servicios-externos"]');
    if (grupo) grupo.remove();
  }
}

function toggleDropdown(dropdown) {
  document.querySelectorAll(".menu-dropdown").forEach((menu) => {
    if (menu !== dropdown) menu.style.display = "none";
  });
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

function conectarServicioOGCWFS() {
  console.log("Conectar servicio OGC WFS no implementado aún.");
}

// Opcional: un helper simple para mostrar mensajes en pantalla
function showMessage(msg, type = "info") {
  // type: "info" | "error" | "success"
  console[type === "error" ? "error" : "log"](msg);
  if (mensajeServicioWeb) {
    mensajeServicioWeb.textContent = msg;
    mensajeServicioWeb.className = type; // usa tus clases CSS si quieres
  }
}

// Extrae capas/servicios desde distintas respuestas posibles de ArcGIS
function parseArcGISResponse(json) {
  // Caso típico de MapServer/FeatureServer
  if (Array.isArray(json?.layers) || Array.isArray(json?.tables)) {
    const layers = (json.layers || []).map((l) => ({ id: l.id, name: l.name }));
    const tables = (json.tables || []).map((t) => ({ id: t.id, name: t.name }));
    return [...layers, ...tables];
  }
  // Caso de “directorio” (lista de servicios)
  if (Array.isArray(json?.services)) {
    // services: [{name:"Carpeta/Servicio", type:"MapServer" | "FeatureServer" | ...}]
    return json.services.map((s, idx) => ({
      id: idx,
      name: `${s.name} (${s.type})`,
      // podrías guardar también la URL completa si quieres
      url: `${json?.currentVersion ? "" : ""}`, // placeholder por si luego deseas construir URLs
    }));
  }
  return [];
}

export async function conectarServicioRestArcGIS() {
  try {
    const urlArcGISRest = (direccionServicioWeb?.value || "").trim();
    if (!urlArcGISRest) {
      showMessage("Ingresa la URL del servicio ArcGIS REST.", "error");
      return;
    }

    // Asegura que la URL no tenga ? ya al final y añade f=json
    const sep = urlArcGISRest.includes("?") ? "&" : "?";
    const url = `${urlArcGISRest}${sep}f=json`;

    // GET es lo correcto para ArcGIS REST
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} al solicitar ${url}`);
    }
    const json = await resp.json();

    // Manejo de errores propios de ArcGIS
    if (json?.error) {
      const msg = `${json.error.message || "Error en ArcGIS REST"} ${
        json.error.details ? json.error.details.join(" | ") : ""
      }`.trim();
      throw new Error(msg);
    }

    // Construimos la lista
    const items = parseArcGISResponse(json);
    if (!items.length) {
      showMessage(
        "No se encontraron capas/servicios en la URL proporcionada.",
        "info"
      );
    }

    // Muestra contenedores y actualiza botones
    if (capasDisponibles) capasDisponibles.style.display = "block";
    if (agregarGrupos) agregarGrupos.style.display = "block";
    if (conectarServicioWeb) {
      conectarServicioWeb.classList.add("disabled");
      conectarServicioWeb.style.display = "none";
    }
    if (limpiarServicioWeb) limpiarServicioWeb.classList.remove("disabled");
    showMessage("");

    // Limpia y llena el <select>
    if (capasTematicas) {
      // Limpia opciones previas
      capasTematicas.innerHTML = "";
      // (opcional) placeholder
      const placeholder = document.createElement("option");
      placeholder.textContent = "Seleccione una capa/servicio…";
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = true;
      capasTematicas.appendChild(placeholder);

      items.forEach((i) => {
        const option = document.createElement("option");
        option.textContent = i.name;
        option.value = String(i.id);
        // si parseArcGISResponse te diera i.url, podrías guardarla en dataset:
        if (i.url) option.dataset.url = i.url;
        capasTematicas.appendChild(option);
      });
    }
  } catch (e) {
    console.error(e);
    showMessage(
      `Error al conectar con el servicio: ${e.message || e}`,
      "error"
    );
  }
}
