import shp from 'shpjs';
import { direccionApiGIS, mostrarToast } from './configuracion';

const columnasExcluidas = ["fid", "id", "objectid", "globalid", "shape__are", "shape__len"];
const archivoZip = document.getElementById("archivoZip");
const btnCargarArchivoZip = document.getElementById("btnCargarArchivoZip");
const columnasArchivoShape = document.getElementById("columnasArchivoShape");
const tablasGeograficas = document.getElementById("tablasGeograficas");
const btnImportarDatos = document.getElementById("btnImportarDatos");

let columnasDisponibles = [];

btnCargarArchivoZip.addEventListener("click", async () => {
    const file = archivoZip.files[0];
    if (!file) {
        mostrarToast("Por favor selecciona un archivo .zip", "error");
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const geojson = await shp(arrayBuffer);
        const properties = geojson.features[0]?.properties;

        if (!properties) {
            mostrarToast("No se encontraron propiedades en el shapefile.", "error");
            return;
        }

        mostrarCampos(Object.keys(properties));
    } catch (error) {
        mostrarToast("Error al procesar el shapefile:", "error");
    }
});

function mostrarCampos(columnas) {
    columnasDisponibles = columnas;

    const columnasFiltradas = columnas.filter(
        col => !columnasExcluidas.includes(col.toLowerCase())
    );

    const tipo = tablasGeograficas.value;
    let camposFijos = [];

    if (tipo === "01") camposFijos = ["cod_sector"];
    else if (tipo === "02") camposFijos = ["cod_sector", "cod_mzna"];
    else if (tipo === "03") camposFijos = ["cod_sector", "cod_mzna", "cod_lote"];

    columnasArchivoShape.innerHTML = "";

    camposFijos.forEach((campo, i) => {
        const row = document.createElement("div");
        row.className = "row mb-2 align-items-center";

        const opciones = columnasFiltradas.map(col =>
            `<option value="${col}">${col}</option>`
        ).join("");

        row.innerHTML = `
        <div class="col-md-6">
            <input type="text" class="form-control" value="${campo}" readonly>
        </div>
        <div class="col-md-6">
            <select class="form-select" name="map_${campo}">
            <option value="">[Elegir]</option>
            ${opciones}
            </select>
        </div>
        `;

        columnasArchivoShape.appendChild(row);
    });
    if (columnas.length > 0) btnImportarDatos.style.display = "block";
}

btnImportarDatos.addEventListener("click", async () => {
    const selects = document.querySelectorAll('select[name^="map_"]');
    let validos = true;

    selects.forEach(select => {
        if (select.value === "") {
            validos = false;
            select.classList.add("is-invalid");
        } else {
            select.classList.remove("is-invalid");
        }
    });

    if (!archivoZip.files.length) {
        mostrarToast("Por favor, selecciona un archivo ZIP de shapefile", "warning");
        return;
    }

    if (!validos) {
        mostrarToast("Selecciona columnas para todos los campos.", "danger");
        return;
    }

    const formData = new FormData();
    formData.append("file", archivoZip.files[0]);

    try {
        // PASO 1: Subir shapefile ZIP
        const response = await fetch(`${direccionApiGIS}subir_shapefile`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Error al subir el archivo");
        const data = await response.json();

        if (!data.estado) {
            mostrarToast(`⚠ ${data.mensaje}`, "warning");
            return;
        }

        //mostrarToast(`✔ ${data.mensaje}`, "success");
        // PASO 2: Insertar datos con los campos seleccionados
        const jsonPayload = {
            nombreCarpeta: data.nombreCarpeta,
            codigoSector: document.querySelector('select[name="map_cod_sector"]').value,
            codigoManzana: document.querySelector('select[name="map_cod_mzna"]').value,
            codigoLote: document.querySelector('select[name="map_cod_lote"]').value
        };

        const insertarResp = await fetch(`${direccionApiGIS}insertar_datos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonPayload)
        });

        const insertarData = await insertarResp.json();

        if (insertarData.estado) {
            mostrarToast(`✅ ${insertarData.mensaje}`, "success");
            archivoZip.value = "";
            columnasArchivoShape.innerHTML = "";
            btnImportarDatos.style.display = "none";
        } else {
            mostrarToast(`⚠ ${insertarData.mensaje}`, "warning");
        }

    } catch (error) {
        console.error("Error:", error);
        mostrarToast("❌ Error en el proceso", "danger");
    }
});
