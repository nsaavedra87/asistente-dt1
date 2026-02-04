// 1. ESTADO DE LA APLICACIÓN (Carga desde memoria o valores por defecto)
let config = JSON.parse(localStorage.getItem('dt1_config')) || {
    objetivo: 100,
    sensibilidad: 50,
    duracionInsulina: 3,
    franjas: [
        { nombre: "Mañana", inicio: 6, fin: 11, ratio: 10 },
        { nombre: "Tarde", inicio: 12, fin: 18, ratio: 12 },
        { nombre: "Noche", inicio: 19, fin: 23, ratio: 15 },
        { nombre: "Madrugada", inicio: 0, fin: 5, ratio: 15 }
    ]
};

let historial = JSON.parse(localStorage.getItem('dt1_historial')) || [];

// 2. NAVEGACIÓN
function mostrarSeccion(seccion) {
    document.getElementById('seccion-calculadora').classList.add('d-none');
    document.getElementById('seccion-historial').classList.add('d-none');
    document.getElementById('seccion-ajustes').classList.add('d-none');
    document.getElementById('sos-container').classList.add('d-none');

    if (seccion === 'calculadora') {
        document.getElementById('seccion-calculadora').classList.remove('d-none');
        document.getElementById('sos-container').classList.remove('d-none');
        actualizarIOBDisplay();
    } else if (seccion === 'historial') {
        document.getElementById('seccion-historial').classList.remove('d-none');
        renderizarHistorial();
    } else if (seccion === 'ajustes') {
        document.getElementById('seccion-ajustes').classList.remove('d-none');
        cargarDatosEnAjustes();
    }
}

// 3. LÓGICA DE INSULINA A BORDO (IOB) - Fórmula Lineal
function calcularIOB() {
    let iobTotal = 0;
    const ahora = new Date();
    
    historial.forEach(registro => {
        const fechaDosis = new Date(registro.fecha);
        const diffHoras = (ahora - fechaDosis) / (1000 * 60 * 60);
        
        if (diffHoras < config.duracionInsulina) {
            // Si la dosis fue de corrección, calculamos cuánto queda activo
            let remanente = 1 - (diffHoras / config.duracionInsulina);
            iobTotal += registro.dosis * remanente;
        }
    });
    return iobTotal;
}

function actualizarIOBDisplay() {
    const iob = calcularIOB();
    const badge = document.getElementById('display-iob');
    if (iob > 0.1) {
        badge.classList.remove('d-none');
        document.getElementById('valor-iob-actual').innerText = iob.toFixed(1);
    } else {
        badge.classList.add('d-none');
    }
}

// 4. CÁLCULO DE DOSIS
function obtenerRatioActual() {
    const hora = new Date().getHours();
    const franja = config.franjas.find(f => hora >= f.inicio && hora <= f.fin);
    return franja ? franja.ratio : 15;
}

function ejecutarCalculo() {
    const g = parseFloat(document.getElementById('inputGlicemia').value);
    const c = parseFloat(document.getElementById('inputCarbos').value);
    
    if (isNaN(g) || isNaN(c)) return alert("Por favor, ingresa números válidos");

    const ratio = obtenerRatioActual();
    const iob = calcularIOB();
    
    const correccion = (g - config.objetivo) / config.sensibilidad;
    const dosisComida = c / ratio;
    
    let total = (correccion + dosisComida) - iob;
    const dosisFinal = Math.max(0, Math.round(total * 2) / 2); // Redondeo 0.5 para plumas

    // Guardar cálculo temporal para confirmar
    window.ultimoCalculo = {
        fecha: new Date(),
        dosis: dosisFinal,
        glicemia: g,
        carbos: c,
        iobRestada: iob.toFixed(1)
    };

    document.getElementById('valorDosis').innerText = dosisFinal + " U";
    document.getElementById('detalleTexto').innerText = `Ratio: 1:${ratio} | IOB: -${iob.toFixed(1)}U | Objetivo: ${config.objetivo}`;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}

function confirmarInyeccion() {
    historial.unshift(window.ultimoCalculo);
    localStorage.setItem('dt1_historial', JSON.stringify(historial));
    document.getElementById('resultadoContainer').classList.add('d-none');
    document.getElementById('inputGlicemia').value = "";
    document.getElementById('inputCarbos').value = "";
    alert("Dosis guardada en la bitácora");
    actualizarIOBDisplay();
}

// 5. GESTIÓN DE HISTORIAL
function renderizarHistorial() {
    const contenedor = document.getElementById('listaHistorial');
    contenedor.innerHTML = "";
    
    historial.forEach((item, index) => {
        const fecha = new Date(item.fecha);
        contenedor.innerHTML += `
            <div class="card p-2 historial-card shadow-sm">
                <div class="d-flex justify-content-between">
                    <strong>${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                    <span class="badge bg-primary fs-6">${item.dosis} U</span>
                </div>
                <div class="small text-muted">
                    Glicemia: ${item.glicemia} | Carbos: ${item.carbos}g | IOB restada: ${item.iobRestada}U
                </div>
            </div>
        `;
    });
}

function borrarHistorial() {
    if (confirm("¿Seguro que quieres borrar todos los registros?")) {
        historial = [];
        localStorage.removeItem('dt1_historial');
        renderizarHistorial();
        actualizarIOBDisplay();
    }
}

// 6. AJUSTES
function cargarDatosEnAjustes() {
    document.getElementById('cfgObjetivo').value = config.objetivo;
    document.getElementById('cfgSensibilidad').value = config.sensibilidad;
    document.getElementById('cfgDuracion').value = config.duracionInsulina;
    
    const lista = document.getElementById('lista-ratios-ajustes');
    lista.innerHTML = "";
    config.franjas.forEach((f, i) => {
        lista.innerHTML += `
            <div class="d-flex align-items-center mb-2">
                <span class="small w-50">${f.nombre}</span>
                <input type="number" class="form-control form-control-sm ratio-input" data-index="${i}" value="${f.ratio}">
            </div>
        `;
    });
}

function guardarAjustes() {
    config.objetivo = parseFloat(document.getElementById('cfgObjetivo').value);
    config.sensibilidad = parseFloat(document.getElementById('cfgSensibilidad').value);
    config.duracionInsulina = parseFloat(document.getElementById('cfgDuracion').value);
    
    document.querySelectorAll('.ratio-input').forEach(input => {
        config.franjas[input.dataset.index].ratio = parseFloat(input.value);
    });

    localStorage.setItem('dt1_config', JSON.stringify(config));
    mostrarSeccion('calculadora');
}

// 7. MODO RESCATE
function modoRescate() {
    const g = prompt("Glicemia actual para rescate:");
    if (!g) return;
    const glice = parseFloat(g);
    if (glice < 55) alert("🚨 SEVERA: Consume 30g de carbos rápidos (soda/jugo) y pide ayuda.");
    else if (glice < 70) alert("📉 LEVE: Consume 15g de carbos rápidos y espera 15 min.");
    else alert("Glicemia fuera de rango de peligro inmediato.");
}

// Iniciar app
actualizarIOBDisplay();
