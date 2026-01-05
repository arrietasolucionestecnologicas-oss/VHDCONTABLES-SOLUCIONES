/**
 * VDH CONTABLE APP
 * Lógica de conexión PWA <-> Google Sheets
 */

// ==========================================================
// ⚠️ PEGA AQUÍ LA URL DE TU APLICACIÓN WEB DE GOOGLE SCRIPT
// Debe terminar en /exec
// ==========================================================
const SCRIPT_URL = "AQUI_PEGA_TU_URL_DEL_SCRIPT_DE_GOOGLE"; 

// 1. Lógica PWA (Instalar App)
let deferredPrompt;
const installBanner = document.getElementById('install-banner');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.style.display = 'block';
});

installBanner.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBanner.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

// 2. Cálculo DV (Dígito Verificación DIAN)
document.getElementById('nit').addEventListener('input', function(e) {
    let nit = e.target.value;
    if(nit.length > 0) {
        document.getElementById('dv_calc').value = calcularDV(nit);
    }
});

function calcularDV(nit) {
    if (!nit || isNaN(nit)) return "";
    let vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let x = 0;
    let y = 0;
    let z = nit.length;
    for (let i = 0; i < z; i++) {
        y = nit.substr(i, 1);
        x += (y * vpri[z - i - 1]);
    }
    y = x % 11;
    return (y > 1) ? 11 - y : y;
}

// 3. UI Lógica (Mostrar/Ocultar IVA)
document.getElementById('checkIva').addEventListener('change', function(e) {
    document.getElementById('divPeriodoIva').style.display = e.target.checked ? 'block' : 'none';
});

// 4. Enviar Datos a Google Sheets (Backend)
document.getElementById('formCliente').addEventListener('submit', function(e) {
    e.preventDefault();

    if (SCRIPT_URL.includes("AQUI_PEGA_TU_URL")) {
        alert("⚠️ ERROR: No has configurado la URL del Script en el archivo app.js");
        return;
    }

    // Mostrar Loader
    document.getElementById('loader').style.display = 'flex';

    const form = e.target;
    // Capturar datos manualmente para asegurar booleanos
    const payload = {
        razonSocial: form.razonSocial.value,
        nit: form.nit.value,
        dv: form.dv.value,
        celular: form.celular.value,
        tipoPersona: form.tipoPersona.value,
        regimen: form.regimen.value,
        aplicaRenta: form.aplicaRenta.checked,
        aplicaIva: form.aplicaIva.checked,
        periodoIva: form.periodoIva.value,
        aplicaRete: form.aplicaRete.checked,
        aplicaIca: form.aplicaIca.checked
    };

    // Enviar por POST usando fetch modo 'no-cors' (Truco para Apps Script desde externo)
    // Nota: no-cors no permite leer respuesta, así que asumimos éxito si no hay error de red.
    const dataToSend = JSON.stringify({ action: "crearCliente", payload: payload });
    
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: dataToSend
    })
    .then(() => {
        document.getElementById('loader').style.display = 'none';
        alert("✅ Cliente guardado correctamente (Sincronizado)");
        form.reset();
        document.getElementById('dv_calc').value = "";
        document.getElementById('divPeriodoIva').style.display = 'none';
    })
    .catch(error => {
        document.getElementById('loader').style.display = 'none';
        alert("❌ Error de conexión: " + error);
    });
});
