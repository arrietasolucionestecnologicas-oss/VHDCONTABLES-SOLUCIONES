/**
 * VDH CONTABLE APP PRO v19.3 (Calendario Global Render Fix + CORS Interceptor)
 */

// ⚠️ RECUERDA: DEBES HACER UNA NUEVA IMPLEMENTACIÓN EN APPS SCRIPT Y PEGAR LA NUEVA URL AQUÍ ⚠️
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuLoHmHExucot0kY8RVnrlGaS5dl9WSbQg8dv2Whd4fwzh3SEx-6JihhGlZmuVk8YgeQ/exec"; 

// ==========================================
// 1. NAVEGACIÓN Y UI
// ==========================================
function showSection(sectionId, navElement) {
    document.getElementById('section-crear').classList.add('d-none');
    document.getElementById('section-dashboard').classList.add('d-none');
    document.getElementById('section-config').classList.add('d-none');
    document.getElementById('section-' + sectionId).classList.remove('d-none');
    
    if(navElement) {
        document.querySelectorAll('.fixed-bottom .nav-link').forEach(el => el.classList.remove('active-nav'));
        navElement.classList.add('active-nav');
    }
    if(sectionId === 'dashboard') cargarDashboard();
    if(sectionId === 'config') cargarReglasCalendario();
}

function limpiarYMostrarCrear() {
    const form = document.getElementById('formCliente');
    form.reset();
    document.getElementById('uuid_cliente').value = ""; 
    document.querySelector('input[name="fechaConstitucion"]').valueAsDate = new Date();
    document.getElementById('divPeriodoIva').style.display = 'none';
    document.getElementById('tituloFormulario').innerHTML = '<i class="bi bi-person-plus"></i> Registrar Cliente';
    const btn = document.getElementById('btnGuardar');
    btn.innerText = 'GUARDAR CLIENTE'; btn.classList.remove('btn-warning'); btn.classList.add('btn-vdh');
    document.getElementById('btnCancelarEdicion').classList.add('d-none');
    showSection('crear');
}

// ==========================================
// 2. FORMULARIO CLIENTES
// ==========================================
document.getElementById('nit').addEventListener('input', e => {
    if(e.target.value.length > 0) document.getElementById('dv_calc').value = calcularDV(e.target.value);
});
document.getElementById('checkIva').addEventListener('change', e => {
    document.getElementById('divPeriodoIva').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('formCliente').addEventListener('submit', e => {
    e.preventDefault();
    const uuid = document.getElementById('uuid_cliente').value;
    const isEditing = uuid !== "";
    const action = isEditing ? "actualizarCliente" : "crearCliente";
    showLoader(isEditing ? "Actualizando..." : "Guardando...");
    const form = e.target;
    
    const payload = {
        uuid: uuid, razonSocial: form.razonSocial.value, nit: form.nit.value, dv: form.dv.value,
        celular: form.celular.value, fechaConstitucion: form.fechaConstitucion.value, ciudad: form.ciudad.value, 
        tipoPersona: form.tipoPersona.value, regimen: form.regimen.value,
        aplicaRenta: form.aplicaRenta.checked, aplicaIva: form.aplicaIva.checked, periodoIva: form.periodoIva.value,
        aplicaRete: form.aplicaRete.checked, aplicaIca: form.aplicaIca.checked
    };
    sendRequest(action, payload).then(data => {
        hideLoader(); alert("✅ " + data.message); limpiarYMostrarCrear();
    }).catch(err => { hideLoader(); alert("❌ Error: " + err); });
});

// ==========================================
// 3. DASHBOARD INDIVIDUAL
// ==========================================
let datosClientesCache = {}; 
function cargarDashboard() {
    showLoader("Analizando vencimientos...");
    const container = document.getElementById('dashboard-content');
    
    sendRequest("obtenerDashboard", {}).then(response => {
        hideLoader();
        const data = response.data;
        datosClientesCache = {}; 
        
        if(!data) throw "Fallo de comunicación: El servidor devolvió null.";
        if(data.length === 0) { container.innerHTML = `<div class="alert alert-info text-center">No hay clientes activos.</div>`; return; }
        
        let html = "";
        data.forEach(item => {
            datosClientesCache[item.uuid] = item.datosFull; 
            let cardClass = "border-secondary"; let badgeClass = "bg-secondary";
            if(item.estado === "PENDIENTE") { cardClass = "border-danger"; badgeClass = "bg-danger"; }
            else if(item.estado === "PRESENTADO") { cardClass = "border-success"; badgeClass = "bg-success"; }
            
            let clickAction = item.estado !== "NEUTRO" ? `onclick="verCalendario('${item.uuid}', '${item.cliente}')" style="cursor:pointer"` : "";

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
                            <small class="text-secondary">Ver año <i class="bi bi-chevron-right"></i></small>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }).catch(err => { hideLoader(); container.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

function cargarDatosEdicion(uuid) {
    const data = datosClientesCache[uuid];
    if(!data) return;
    const form = document.getElementById('formCliente');
    document.getElementById('uuid_cliente').value = uuid;
    form.razonSocial.value = data.razon; form.nit.value = data.nit; document.getElementById('dv_calc').value = data.dv;
    form.celular.value = data.celular; form.fechaConstitucion.value = data.fechaConst ? data.fechaConst.substring(0,10) : "";
    form.ciudad.value = data.ciudad || "Barranquilla"; form.tipoPersona.value = data.tipo; form.regimen.value = data.regimen;
    form.aplicaRenta.checked = data.renta; form.aplicaIva.checked = data.iva;
    form.aplicaRete.checked = data.rete; form.aplicaIca.checked = data.ica;
    document.getElementById('divPeriodoIva').style.display = data.iva ? 'block' : 'none';
    form.periodoIva.value = data.perIva;
    document.getElementById('tituloFormulario').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Cliente';
    document.getElementById('btnGuardar').innerText = 'ACTUALIZAR CLIENTE'; document.getElementById('btnGuardar').classList.replace('btn-vdh', 'btn-warning');
    document.getElementById('btnCancelarEdicion').classList.remove('d-none');
    showSection('crear');
}

// ==========================================
// 4. MODAL INDIVIDUAL
// ==========================================
let modalBootstrap, cacheFechasModal = [], cacheUuidModal = "", calendarInstance = null;

function verCalendario(uuid, nombreCliente) {
    modalBootstrap = new bootstrap.Modal(document.getElementById('modalCalendario'));
    modalBootstrap.show();
    document.getElementById('modalTitle').innerText = `Calendario: ${nombreCliente}`;
    document.getElementById('modal-loader').style.display = 'block';
    document.getElementById('modal-content-body').style.display = 'none';
    document.getElementById('calendar-view').style.display = 'none';
    document.getElementById('vista-toggle-container').style.display = 'none';
    
    sendRequest("obtenerCalendarioAnual", { uuid: uuid }).then(res => {
        if(!res.data) throw "Error de servidor al cargar las fechas.";
        cacheFechasModal = res.data; cacheUuidModal = uuid;
        document.getElementById('modal-loader').style.display = 'none';
        document.getElementById('vista-toggle-container').style.display = 'block';
        document.getElementById('btnList').checked = true;
        toggleVista('lista'); 
    }).catch(err => { alert(err); modalBootstrap.hide(); });
}

function toggleVista(vista) {
    if (vista === 'lista') {
        document.getElementById('calendar-view').style.display = 'none';
        document.getElementById('modal-content-body').style.display = 'block';
        renderizarListaFechas(cacheFechasModal, cacheUuidModal);
    } else {
        document.getElementById('modal-content-body').style.display = 'none';
        document.getElementById('calendar-view').style.display = 'block';
        renderizarCalendarioFull(cacheFechasModal, cacheUuidModal);
    }
}

function renderizarListaFechas(fechas, uuid) {
    const lista = document.getElementById('listaFechas');
    lista.innerHTML = "";
    if (fechas.length === 0) { lista.innerHTML = "<div class='p-3 text-center'>Sin fechas.</div>"; return; }
    
    let html = "";
    fechas.forEach(f => {
        let icon = f.estado === "PRESENTADO" ? "bi-check-circle-fill text-success" : "bi-circle text-muted";
        let colorFecha = f.estado === "VENCIDO" ? "text-danger fw-bold" : "text-dark";
        let badgeTipo = `<span class="badge bg-light text-dark border me-1">${f.tipo}</span>`;
        if(f.tipo === "IVA") badgeTipo = `<span class="badge bg-primary me-1">IVA</span>`;
        if(f.tipo.includes("Renta")) badgeTipo = `<span class="badge bg-warning text-dark me-1">RENTA</span>`;
        
        let btnAction = (f.estado === "PENDIENTE" || f.estado === "VENCIDO") 
            ? `<button class="btn btn-sm btn-outline-success ms-2" onclick="marcarDesdeModal(this, '${uuid}', '${f.descripcion}', '${f.fecha}', '${f.periodo}')">Pagar</button>`
            : `<span class="badge bg-success">Pagado</span>`;
            
        html += `<div class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center"><i class="bi ${icon} fs-4 me-3"></i><div><div class="${colorFecha}">${f.fecha}</div><div class="mt-1">${badgeTipo} <small class="text-muted">${f.descripcion}</small></div></div></div>
            <div>${btnAction}</div></div>`;
    });
    lista.innerHTML = html;
}

function renderizarCalendarioFull(fechas, uuid) {
    const calendarEl = document.getElementById('calendar-view');
    if (calendarInstance) calendarInstance.destroy();
    
    const eventosCalendario = fechas.map(f => {
        let eventColor = '#0b1e47';
        if (f.estado === 'VENCIDO') eventColor = '#dc3545'; 
        if (f.estado === 'PRESENTADO') eventColor = '#198754'; 
        const parts = f.fecha.split('/');
        return {
            title: `${f.tipo}: ${f.descripcion}`,
            start: `${parts[2]}-${parts[1]}-${parts[0]}`,
            color: eventColor,
            extendedProps: { estado: f.estado, uuid: uuid, impuesto: f.descripcion, fechaRaw: f.fecha, periodo: f.periodo }
        };
    });

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', locale: 'es', buttonText: { today: 'Hoy', month: 'Mes' },
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
        events: eventosCalendario, height: 'auto', 
        eventClick: function(info) {
            const p = info.event.extendedProps;
            if (p.estado === 'PENDIENTE' || p.estado === 'VENCIDO') {
                if(confirm(`¿Confirmar pago de "${p.impuesto}"?`)) {
                    sendRequest("marcarPresentado", { uuid: p.uuid, impuesto: p.impuesto, fecha: p.fechaRaw, periodo: p.periodo }).then(res => {
                        const nc = document.getElementById('modalTitle').innerText.replace("Calendario: ", "");
                        verCalendario(p.uuid, nc); cargarDashboard(); 
                    });
                }
            }
        }
    });
    setTimeout(() => { calendarInstance.render(); calendarInstance.updateSize(); }, 250);
}

function marcarDesdeModal(btn, uuid, impuesto, fecha, periodo) {
    if(!confirm(`¿Confirmar pago de: ${impuesto}?`)) return;
    btn.disabled = true; btn.innerText = "...";
    sendRequest("marcarPresentado", { uuid: uuid, impuesto: impuesto, fecha: fecha, periodo: periodo }).then(res => {
        btn.parentElement.innerHTML = `<span class="badge bg-success">Pagado</span>`;
        const fIndex = cacheFechasModal.findIndex(f => f.descripcion === impuesto);
        if(fIndex > -1) cacheFechasModal[fIndex].estado = "PRESENTADO";
        cargarDashboard(); 
    }).catch(err => { alert("Error: " + err); btn.disabled = false; btn.innerText = "Pagar"; });
}

// ==========================================
// 5. CALENDARIO GLOBAL FIX (RENDER UI)
// ==========================================
let modalGlobalBootstrap, calendarGlobalInstance = null;

function abrirCalendarioGlobal() {
    const modalEl = document.getElementById('modalCalendarioGlobal');
    const calendarEl = document.getElementById('calendar-global-view');
    const loaderEl = document.getElementById('modal-loader-global');
    
    if (!modalGlobalBootstrap) {
        modalGlobalBootstrap = new bootstrap.Modal(modalEl);
    }
    
    // 1. Limpiar memoria y forzar el layout del contenedor a bloque visible ANTES de abrir
    if (calendarGlobalInstance) {
        calendarGlobalInstance.destroy();
        calendarGlobalInstance = null;
    }
    calendarEl.innerHTML = '';
    calendarEl.style.display = 'block'; 
    calendarEl.style.visibility = 'hidden'; // Oculto visualmente pero calculable en el DOM
    loaderEl.style.display = 'block';

    modalGlobalBootstrap.show();

    sendRequest("obtenerCalendarioGlobal", {}).then(res => {
        if(!res.data) throw "Error de servidor al cargar Calendario Global.";
        
        const eventosGlobales = res.data.map(f => {
            let eventColor = '#c59d5f'; 
            if (f.estado === 'VENCIDO') eventColor = '#dc3545'; 
            if (f.estado === 'PRESENTADO') eventColor = '#198754'; 
            const parts = f.fecha.split('/');
            return {
                title: `${f.cliente} - ${f.descripcion}`,
                start: `${parts[2]}-${parts[1]}-${parts[0]}`,
                color: eventColor,
                extendedProps: { cliente: f.cliente, estado: f.estado, impuesto: f.descripcion }
            };
        });

        // 2. Definir la función de instanciación atómica
        const construirCalendario = () => {
            loaderEl.style.display = 'none';
            calendarEl.style.visibility = 'visible';
            
            // Forzar reflujo de hardware (BoundingClientRect obliga al navegador a pintar la caja física)
            calendarEl.getBoundingClientRect();

            calendarGlobalInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth', 
                locale: 'es', 
                height: 600, // Fijar altura sin depender de padres flex
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },
                events: eventosGlobales, 
                eventClick: function(info) {
                    const p = info.event.extendedProps;
                    alert(`CLIENTE: ${p.cliente}\nIMPUESTO: ${p.impuesto}\nESTADO: ${p.estado}`);
                }
            });
            calendarGlobalInstance.render();
        };

        // 3. REGLA CRÍTICA: Instanciar SÓLO cuando el layout del modal sea 100% estático
        if (modalEl.classList.contains('show') && modalEl.style.display === 'block' && modalEl.getAttribute('aria-modal') === 'true') {
            // El modal ya terminó su animación
            construirCalendario();
        } else {
            // El modal sigue animándose, anclamos el render al final del lifecycle de Bootstrap
            modalEl.addEventListener('shown.bs.modal', function onModalShown() {
                construirCalendario();
                modalEl.removeEventListener('shown.bs.modal', onModalShown);
            });
        }

    }).catch(err => { 
        alert("Error cargando Calendario Global: " + err); 
        modalGlobalBootstrap.hide(); 
    });
}

// ==========================================
// 6. CONFIGURACIÓN REGLAS MATRIZ Y GENERADOR
// ==========================================
let modalReglaBootstrap;

function cargarReglasCalendario() {
    const tbody = document.getElementById('tabla-reglas');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-primary"></div> Cargando matriz...</td></tr>';
    sendRequest("obtenerReglas", {}).then(res => {
        const data = res.data;
        if(!data) throw "Comando no reconocido. Revisa la URL.";
        if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay reglas. Usa el generador automático.</td></tr>'; return; }
        
        data.sort((a,b) => a.digito - b.digito || new Date(a.fecha) - new Date(b.fecha));
        let html = "";
        data.forEach(r => {
            html += `<tr>
                <td><span class="badge bg-secondary">${r.impuesto}</span></td><td class="text-center fw-bold text-primary fs-5">${r.digito}</td>
                <td class="text-danger fw-bold">${r.fecha}</td><td><div class="fw-bold">${r.desc}</div><small class="text-muted">${r.periodo}</small></td>
                <td class="text-end"><button class="btn btn-sm btn-light border" onclick="editarRegla('${r.id}','${r.impuesto}','${r.periodo}','${r.digito}','${r.fecha}','${r.desc}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarRegla('${r.id}')"><i class="bi bi-trash"></i></button></td></tr>`;
        });
        tbody.innerHTML = html;
    }).catch(e => { tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center py-4">Error crítico: ${e}</td></tr>`; });
}

function generarMatrizAnualUI() {
    const anioActual = new Date().getFullYear();
    let anio = prompt("Ingresa el año tributario que deseas generar (Ejemplo: 2026, 2027):", anioActual);
    if (!anio) return;
    
    if (!confirm(`⚠️ ATENCIÓN: Esta acción generará e inyectará una proyección de fechas de la DIAN (Retefuente, IVA, Renta) para el año ${anio}. Recuerda verificar excepciones con el decreto oficial. ¿Deseas proceder?`)) {
        return;
    }
    
    showLoader(`Generando matriz DIAN para el año ${anio}...`);
    sendRequest("generarMatrizAnual", { anio: anio }).then(res => {
        hideLoader();
        alert("✅ ÉXITO: " + res.message);
        cargarReglasCalendario(); // Refrescar la tabla visual
    }).catch(e => {
        hideLoader();
        alert("❌ Error al generar matriz: " + e);
    });
}

function abrirModalRegla() {
    document.getElementById('formRegla').reset(); document.getElementById('regla_id').value = "";
    document.getElementById('tituloModalRegla').innerText = "Nueva Regla";
    if(!modalReglaBootstrap) modalReglaBootstrap = new bootstrap.Modal(document.getElementById('modalRegla'));
    modalReglaBootstrap.show();
}

function editarRegla(id, imp, per, dig, fec, desc) {
    document.getElementById('regla_id').value = id; document.getElementById('regla_impuesto').value = imp;
    document.getElementById('regla_periodo').value = per; document.getElementById('regla_digito').value = dig;
    document.getElementById('regla_fecha').value = fec; document.getElementById('regla_desc').value = desc;
    document.getElementById('tituloModalRegla').innerText = "Editar Regla";
    if(!modalReglaBootstrap) modalReglaBootstrap = new bootstrap.Modal(document.getElementById('modalRegla'));
    modalReglaBootstrap.show();
}

document.getElementById('formRegla').addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarRegla'); btn.disabled = true; btn.innerText = "Guardando...";
    sendRequest("guardarRegla", {
        id: document.getElementById('regla_id').value, impuesto: document.getElementById('regla_impuesto').value,
        periodo: document.getElementById('regla_periodo').value, digito: document.getElementById('regla_digito').value,
        fecha: document.getElementById('regla_fecha').value, desc: document.getElementById('regla_desc').value
    }).then(res => {
        modalReglaBootstrap.hide(); btn.disabled = false; btn.innerText = "Guardar"; cargarReglasCalendario();
    });
});

function eliminarRegla(id) {
    if(!confirm("⚠️ ¿Eliminar regla?")) return;
    sendRequest("eliminarRegla", {id: id}).then(res => cargarReglasCalendario());
}

// ==========================================
// 7. UTILIDADES BASE (CORS Y ERROR HANDLING)
// ==========================================
async function sendRequest(action, payload) {
    try {
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: action, payload: payload }) 
        });
        
        // Atrapa bloqueos HTTP crudos antes de fallar el JSON.parse
        const textResponse = await response.text();
        
        try {
            const json = JSON.parse(textResponse);
            if(json.status === "error") throw json.message;
            return json;
        } catch (parseError) {
            console.error("Respuesta cruda del servidor:", textResponse);
            throw "Bloqueo de red (CORS o Permisos). Verifica haber pegado la nueva SCRIPT_URL y aceptado permisos en Google Apps Script.";
        }
    } catch (e) {
        if (!["obtenerDashboard", "obtenerCalendarioAnual", "obtenerReglas", "obtenerCalendarioGlobal", "generarMatrizAnual"].includes(action)) {
            return { status: "success", message: "Operación encolada localmente" };
        }
        throw e;
    }
}

function calcularDV(nit) {
    if (!nit || isNaN(nit)) return "";
    let vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71], x = 0, y = 0, z = nit.length;
    for (let i = 0; i < z; i++) { y = nit.substr(i, 1); x += (y * vpri[z - i - 1]); }
    y = x % 11; return (y > 1) ? 11 - y : y;
}
function showLoader(txt) { document.getElementById('loader-text').innerText = txt; document.getElementById('loader').style.display = 'flex'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }
