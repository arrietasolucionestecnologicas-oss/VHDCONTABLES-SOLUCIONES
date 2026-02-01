/**
 * VDH CONTABLE APP PRO v13.0
 * Author: Gemini Architect
 */

// ⚠️ PEGA AQUÍ LA URL ACTUALIZADA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyubr3wxCftRobp80h3KUgzZymjqrnasvB5HaJfi81Hn3XDh0sP28uoIuOU3B46cPpP/exec"; 

/**
 * VDH CONTABLE SYSTEM - FRONTEND SAAS
 * Versión: 4.0.0 (Producción)
 */

// --- ESTADO GLOBAL ---
const state = {
    dbId: null,          // ID del Excel del Cliente (Se llena al hacer login)
    empresaNombre: null, 
    trabajadores: [],
    clientes: [],
    tokenSesion: null
};

// --- NÚCLEO DE COMUNICACIÓN (BRIDGE) ---
async function sendRequest(action, payload = {}) {
    // Inyectamos automáticamente el ID de la base de datos si ya estamos logueados
    if (state.dbId) {
        payload.dbId = state.dbId;
    }

    const options = { 
        method: "POST", 
        body: JSON.stringify({ action: action, payload: payload }) 
    };
    
    try {
        const response = await fetch(CONFIG.API_URL, options);
        const json = await response.json();
        return json;
    } catch (e) {
        console.error("Error crítico:", e);
        throw "No se pudo conectar con el Servidor Central.";
    }
}

// --- APLICACIÓN PRINCIPAL ---
const app = {
    init: function() {
        console.log("VDH SaaS Iniciado");
        
        // Listeners
        const btnLogin = document.getElementById('btn-login-action');
        if(btnLogin) btnLogin.addEventListener('click', () => this.login());

        const formHoras = document.getElementById('form-horas');
        if(formHoras) formHoras.addEventListener('submit', (e) => this.guardarHoras(e));

        // Arrancar en Login
        this.verificarSesion();
    },

    verificarSesion: function() {
        this.mostrarPantalla('view-login');
        this.cargarListaEmpresas();
    },

    mostrarPantalla: function(viewId) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('d-none'));
        const target = document.getElementById(viewId);
        if(target) target.classList.remove('d-none');
    },

    toggleLoader: function(show) {
        const el = document.getElementById('loader');
        if(el) show ? el.classList.remove('d-none') : el.classList.add('d-none');
    },

    mostrarToast: function(msg, type='success') {
        const toastEl = document.getElementById('liveToast');
        if(toastEl) {
            document.getElementById('toast-message').innerText = msg;
            const bsToast = new bootstrap.Toast(toastEl);
            bsToast.show();
        } else {
            alert(msg);
        }
    },

    // --- MÓDULO DE LOGIN ---

    cargarListaEmpresas: function() {
        this.toggleLoader(true);
        sendRequest("get_empresas_list").then(json => {
            if(json.status === 'success') {
                const sel = document.getElementById('login-empresa-select');
                sel.innerHTML = '<option value="" selected disabled>Seleccione su Empresa...</option>';
                
                if(json.data.length === 0) {
                     sel.innerHTML = '<option disabled>No hay empresas activas</option>';
                }

                json.data.forEach(emp => {
                    let opt = document.createElement('option');
                    opt.value = emp.id;
                    opt.text = emp.nombre;
                    sel.appendChild(opt);
                });
            } else {
                console.error("Error cargando empresas:", json);
            }
        }).catch(err => {
            console.error(err);
            alert("Error de conexión. Revise la consola.");
        }).finally(() => this.toggleLoader(false));
    },

    login: function() {
        const empresaId = document.getElementById('login-empresa-select').value;
        const token = document.getElementById('login-token').value;

        if(!empresaId || !token) return alert("Seleccione empresa e ingrese el Token.");

        this.toggleLoader(true);
        sendRequest("login_empresa", { empresaId, token }).then(json => {
            if(json.status === 'success') {
                // LOGIN EXITOSO
                state.dbId = json.data.dbId;
                state.empresaNombre = json.data.nombre;
                
                // Actualizar UI
                document.getElementById('nav-empresa-label').innerText = state.empresaNombre;
                this.mostrarPantalla('view-digitador');
                
                // Cargar datos de la empresa seleccionada
                this.fetchMetadata();
            } else {
                alert("❌ Acceso denegado: " + json.message);
            }
        }).catch(e => alert(e))
          .finally(() => this.toggleLoader(false));
    },

    logout: function() {
        state.dbId = null;
        state.empresaNombre = null;
        document.getElementById('login-token').value = "";
        this.mostrarPantalla('view-login');
    },

    // --- MÓDULO DE OPERACIÓN ---
    
    // Navegación
    irADigitador: function() { this.mostrarPantalla('view-digitador'); },
    
    irAContador: function() { 
        // Aquí podrías pedir otro PIN si quisieras seguridad extra para el contador
        this.mostrarPantalla('view-contador');
        this.cargarReporteContador();
    },

    fetchMetadata: function() {
        this.toggleLoader(true);
        sendRequest("get_metadata").then(json => {
            if (json.status === 'success') {
                state.trabajadores = json.data.empleados;
                state.clientes = json.data.clientes;
                // Configuración opcional
                if(json.data.config) this.renderConfig(json.data.config);
                
                this.renderListas();
            }
        }).finally(() => this.toggleLoader(false));
    },

    renderListas: function() {
        this.llenarSelect('inputTrabajador', state.trabajadores);
        this.llenarSelect('inputCliente', state.clientes);
    },

    llenarSelect: function(id, array) {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.innerHTML = '<option value="" selected disabled>Seleccione...</option>';
        if(array) {
            array.forEach(item => {
                let opt = document.createElement('option');
                opt.value = item;
                opt.text = item;
                sel.appendChild(opt);
            });
        }
    },

    guardarHoras: function(e) {
        e.preventDefault();
        this.toggleLoader(true);
        
        const datos = {
            registros: [{
                trabajador: document.getElementById('inputTrabajador').value,
                fecha: document.getElementById('inputFecha').value,
                cliente: document.getElementById('inputCliente').value,
                trabajo: document.getElementById('inputActividad').value,
                entrada: document.getElementById('inputEntrada').value,
                salida: document.getElementById('inputSalida').value,
                almuerzo: document.getElementById('checkAlmuerzo').checked
            }]
        };

        sendRequest("registrar_horas", datos).then(json => {
            if(json.status === 'success') {
                this.mostrarToast("Registro guardado en: " + state.empresaNombre);
                document.getElementById('form-horas').reset();
                document.getElementById('inputFecha').valueAsDate = new Date();
            } else { 
                alert("Error: " + json.message); 
            }
        }).finally(() => this.toggleLoader(false));
    },

    // --- MÓDULO CONTADOR ---
    cargarReporteContador: function() {
        // Reutilizamos la misma lógica de "registrar_horas" pero pidiendo reporte
        // En este ejemplo simple, asumimos que "get_metadata" ya traía config, 
        // faltaría implementar 'obtener_reporte_full' en el backend si se requiere la tabla.
        // Por ahora, solo configuración:
        // (Dejamos el espacio listo para cuando quieras la tabla de aprobaciones)
    },

    renderConfig: function(cfg) {
        if(!cfg) return;
        if(cfg.HORA_NOCTURNA_INICIO) {
            const el = document.getElementById('conf-noc-ini');
            if(el) el.value = cfg.HORA_NOCTURNA_INICIO;
        }
        if(cfg.HORA_NOCTURNA_FIN) {
            const el = document.getElementById('conf-noc-fin');
            if(el) el.value = cfg.HORA_NOCTURNA_FIN;
        }
        if(cfg.RECARGO_NOCTURNO) {
            const el = document.getElementById('conf-rec-noc');
            if(el) el.value = cfg.RECARGO_NOCTURNO;
        }
    },

    guardarConfiguracion: function() {
        this.toggleLoader(true);
        const data = {
            hora_noc_ini: document.getElementById('conf-noc-ini').value,
            hora_noc_fin: document.getElementById('conf-noc-fin').value,
            recargo_noc: document.getElementById('conf-rec-noc').value
        };
        sendRequest("guardar_config", data).then(() => {
            this.mostrarToast("Parámetros actualizados para: " + state.empresaNombre);
        }).finally(() => this.toggleLoader(false));
    }
};

// --- MODALES ---
const modals = {
    nuevoTrabajador: () => {
        const m = new bootstrap.Modal(document.getElementById('modalTrabajador'));
        m.show();
    },
    
    guardarTrabajador: () => {
        const nombre = document.getElementById('new-worker-name').value;
        const salario = document.getElementById('new-worker-salary').value;
        if(nombre && salario) {
            app.toggleLoader(true);
            sendRequest("crear_trabajador", { nombre, salario }).then(() => {
                app.mostrarToast("Trabajador creado");
                bootstrap.Modal.getInstance(document.getElementById('modalTrabajador')).hide();
                app.fetchMetadata(); // Recargar listas
            }).finally(() => app.toggleLoader(false));
        }
    },

    nuevoCliente: () => {
        const m = new bootstrap.Modal(document.getElementById('modalCliente'));
        m.show();
    },

    guardarCliente: () => {
        const nombre = document.getElementById('new-client-name').value;
        if(nombre) {
            app.toggleLoader(true);
            sendRequest("crear_cliente", { nombre }).then(() => {
                app.mostrarToast("Cliente creado");
                bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
                app.fetchMetadata(); // Recargar listas
            }).finally(() => app.toggleLoader(false));
        }
    }
};

// Exponer globalmente
window.app = app;
window.modals = modals;

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => app.init());
