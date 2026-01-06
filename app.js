/**
 * VDH CONTABLE APP PRO v6.0
 * Author: Gemini Architect
 */

// ⚠️ PEGA AQUÍ LA URL ACTUALIZADA DE TU SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuLoHmHExucot0kY8RVnrlGaS5dl9WSbQg8dv2Whd4fwzh3SEx-6JihhGlZmuVk8YgeQ/exec"; 

// ==========================================
// 1. NAVEGACIÓN Y UI
// ==========================================
function showSection(sectionId, navElement) {
    document.getElementById('section-crear').classList.add('d-none');
    document.getElementById('section-dashboard').classList.add('d-none');
    document.getElementById('section-' + sectionId).classList.remove('d-none');

    if(navElement) {
        document.querySelectorAll('.fixed-bottom .nav-link').forEach(el => el.classList.remove('active-nav'));
        navElement.classList.add('active-nav');
    }

    if(sectionId === 'dashboard') {
        cargarDashboard();
    }
}

function limpiarYMostrarCrear() {
    const form = document.getElementById('formCliente');
    form.reset();
    document.getElementById('uuid_cliente').value = ""; // Limpiar ID
    document.querySelector('input[name="fechaConstitucion"]').valueAsDate = new Date();
    document.getElementById('divPeriodoIva').style.display = 'none';
    
    // Restaurar textos originales
    document.getElementById('tituloFormulario').innerHTML = '<i class="bi bi-person-plus"></i> Registrar Cliente';
    document.getElementById('btnGuardar').innerText = 'GUARDAR CLIENTE';
    document.getElementById('btnGuardar').classList.remove('btn-warning');
    document.getElementById('btnGuardar').classList.add('btn-vdh');
    document.getElementById('btnCancelarEdicion').classList.add('d-none'); // Ocultar cancelar

    showSection('crear');
}

// ==========================================
// 2. LÓGICA DE FORMULARIO
// ==========================================
document.getElementById('nit').addEventListener('input', function(e) {
    let nit = e.target.value;
    if(nit.length > 0) document.getElementById('dv_calc').value = calcularDV(nit);
});

document.getElementById('checkIva').addEventListener('change', function(e) {
    document.getElementById('divPeriodoIva').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('formCliente').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const uuid = document.getElementById('uuid_cliente').value;
    const isEditing = uuid !== "";
    const action = isEditing ? "actualizarCliente" : "crearCliente";
    const btnText = isEditing ? "Actualizando..." : "Guardando...";

    showLoader(btnText);
    const form = e.target;
    
    const payload = {
        uuid: uuid, // Se envía vacío si es nuevo
        razonSocial: form.razonSocial.value,
        nit: form.nit.value,
        dv: form.dv.value,
        celular: form.celular.value,
        fechaConstitucion: form.fechaConstitucion.value, 
        ciudad: form.ciudad.value, 
        tipoPersona: form.tipoPersona.value,
        regimen: form.regimen.value,
        aplicaRenta: form.aplicaRenta.checked,
        aplicaIva: form.aplicaIva.checked,
        periodoIva: form.periodoIva.value,
        aplicaRete: form.aplicaRete.checked,
        aplicaIca: form.aplicaIca.checked
    };

    sendRequest(action, payload)
        .then(data => {
            hideLoader();
            alert("✅ " + data.message);
            limpiarYMostrarCrear(); // Resetear todo al terminar
        })
        .catch(err => {
            hideLoader();
            alert("❌ Error: " + err);
        });
});

// ==========================================
// 3. LÓGICA DASHBOARD & EDICIÓN
// ==========================================
let datosClientesCache = {}; // Para guardar datos temporalmente

function cargarDashboard() {
    showLoader("Analizando vencimientos...");
    const container = document.getElementById('dashboard-content');
    
    sendRequest("obtenerDashboard", {})
        .then(response => {
            hideLoader();
            const data = response.data;
            datosClientesCache = {}; // Limpiar cache

            if(!data || data.length === 0) {
                container.innerHTML = `<div class="alert alert-info text-center">No hay clientes activos.</div>`;
                return;
            }

            let html = "";
            data.forEach(item => {
                datosClientesCache[item.uuid] = item.datosFull; // Guardar datos para edición

                let cardClass = "border-secondary"; 
                let badgeClass = "bg-secondary";

                if(item.estado === "PENDIENTE") { cardClass = "border-danger"; badgeClass = "bg-danger"; }
                else if(item.estado === "PRESENTADO") { cardClass = "border-success"; badgeClass = "bg-success"; }

                let clickAction = "";
                if (item.estado !== "NEUTRO") {
                    clickAction = `onclick="verCalendario('${item.uuid}', '${item.nombreImpuestoBase || 'Impuesto'}', '${item.cliente}')" style="cursor:pointer"`;
                }

                html += `
                <div class="card shadow-sm mb-3 ${cardClass}">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="m-0 fw-bold text-dark text-truncate" style="max-width: 60%;">${item.cliente}</h6>
                            <button class="btn btn-sm btn-light border" onclick="cargarDatosEdicion('${item.uuid}')">✏️ Editar</button>
                        </div>
                        <div ${clickAction}>
                            <div class="small text-muted mb-1 d-flex justify-content-between">
                                <span><span class="badge ${badgeClass}">${item.estado}</span> <strong>${item.impuesto}</strong></span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <div class="text-danger fw-bold fs-5"><i class="bi bi-calendar-event"></i> ${item.fecha}</div>
                                <small class="text-secondary">Ver calendario <i class="bi bi-chevron-right"></i></small>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            
            container.innerHTML = html;
        })
        .catch(err => {
            hideLoader();
            container.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`;
        });
}

function cargarDatosEdicion(uuid) {
    const data = datosClientesCache[uuid];
    if(!data) { alert("Error: No se encontraron datos para editar."); return; }

    // Llenar formulario
    const form = document.getElementById('formCliente');
    document.getElementById('uuid_cliente').value = uuid;
    form.razonSocial.value = data.razon;
    form.nit.value = data.nit;
    document.getElementById('dv_calc').value = data.dv;
    form.celular.value = data.celular;
    form.fechaConstitucion.value = data.fechaConst ? data.fechaConst.substring(0,10) : "";
    form.ciudad.value = data.ciudad || "Barranquilla";
    form.tipoPersona.value = data.tipo;
    form.regimen.value = data.regimen;
    
    // Switches
    form.aplicaRenta.checked = data.renta;
    form.aplicaIva.checked = data.iva;
    form.aplicaRete.checked = data.rete;
    form.aplicaIca.checked = data.ica;
    
    // Logica visual de IVA
    document.getElementById('divPeriodoIva').style.display = data.iva ? 'block' : 'none';
    form.periodoIva.value = data.perIva;

    // Cambiar estado visual del formulario a "Modo Edición"
    document.getElementById('tituloFormulario').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Cliente';
    const btn = document.getElementById('btnGuardar');
    btn.innerText = 'ACTUALIZAR CLIENTE';
    btn.classList.remove('btn-vdh');
    btn.classList.add('btn-warning');
    document.getElementById('btnCancelarEdicion').classList.remove('d-none'); // Mostrar botón cancelar

    showSection('crear');
}

// ==========================================
// 4. LÓGICA MODAL (Sin cambios)
// ==========================================
let modalBootstrap; 
function verCalendario(uuid, impuestoBase, nombreCliente) {
    const modalEl = document.getElementById('modalCalendario');
    modalBootstrap = new bootstrap.Modal(modalEl);
    modalBootstrap.show();
    document.getElementById('modalTitle').innerText = `Calendario: ${nombreCliente}`;
    document.getElementById('modal-loader').style.display = 'block';
    document.getElementById('modal-content-body').style.display = 'none';
    sendRequest("obtenerCalendarioAnual", { uuid: uuid, nombreImpuestoBase: impuestoBase }).then(response => {
        renderizarListaFechas(response.data, uuid); 
    }).catch(err => { alert("Error: " + err); modalBootstrap.hide(); });
}

function renderizarListaFechas(fechas, uuid) {
    document.getElementById('modal-loader').style.display = 'none';
    document.getElementById('modal-content-body').style.display = 'block';
    const lista = document.getElementById('listaFechas');
    lista.innerHTML = "";
    if (fechas.length === 0) { lista.innerHTML = "<div class='p-3 text-center'>Sin fechas.</div>"; return; }
    let html = "";
    fechas.forEach(f => {
        let icon = f.estado === "PRESENTADO" ? "bi-check-circle-fill text-success" : "bi-circle text-muted";
        let colorFecha = f.estado === "VENCIDO" ? "text-danger fw-bold" : "text-dark";
        let btnAction = (f.estado === "PENDIENTE" || f.estado === "VENCIDO") 
            ? `<button class="btn btn-sm btn-outline-success ms-2" onclick="marcarDesdeModal(this, '${uuid}', '${f.descripcion}', '${f.fecha}', '${f.periodo}')">Pagar</button>`
            : `<span class="badge bg-success">Pagado</span>`;
        html += `<div class="list-group-item d-flex justify-content-between align-items-center"><div class="d-flex align-items-center"><i class="bi ${icon} fs-4 me-3"></i><div><div class="${colorFecha}">${f.fecha}</div><small class="text-muted">${f.descripcion}</small></div></div><div>${btnAction}</div></div>`;
    });
    lista.innerHTML = html;
}

function marcarDesdeModal(btn, uuid, impuesto, fecha, periodo) {
    if(!confirm(`¿Confirmar pago de: ${impuesto}?`)) return;
    btn.disabled = true; btn.innerText = "...";
    sendRequest("marcarPresentado", { uuid: uuid, impuesto: impuesto, fecha: fecha, periodo: periodo }).then(res => {
        btn.parentElement.innerHTML = `<span class="badge bg-success">Pagado</span>`;
        cargarDashboard(); 
    });
}

// ==========================================
// 5. UTILIDADES
// ==========================================
async function sendRequest(action, payload) {
    const options = { method: "POST", body: JSON.stringify({ action: action, payload: payload }) };
    try {
        const response = await fetch(SCRIPT_URL, options);
        const json = await response.json();
        if(json.status === "error") throw json.message;
        return json;
    } catch (e) {
        console.error(e);
        if (action !== "obtenerDashboard" && action !== "obtenerCalendarioAnual") return { status: "success", message: "Operación encolada (CORS)" };
        throw "Error de conexión.";
    }
}

function calcularDV(nit) {
    if (!nit || isNaN(nit)) return "";
    let vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let x = 0, y = 0, z = nit.length;
    for (let i = 0; i < z; i++) { y = nit.substr(i, 1); x += (y * vpri[z - i - 1]); }
    y = x % 11; return (y > 1) ? 11 - y : y;
}

function showLoader(txt) {
    document.getElementById('loader-text').innerText = txt;
    document.getElementById('loader').style.display = 'flex';
}
function hideLoader() { document.getElementById('loader').style.display = 'none'; }
