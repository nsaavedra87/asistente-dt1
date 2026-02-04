// 1. CARGAR CONFIGURACIÓN (De la memoria o por defecto)
let config = JSON.parse(localStorage.getItem('dt1_config')) || {
    objetivo: 100,
    sensibilidad: 50,
    franjas: [
        { nombre: "Mañana", inicio: 6, fin: 11, ratio: 10 },
        { nombre: "Tarde", inicio: 12, fin: 18, ratio: 12 },
        { nombre: "Noche", inicio: 19, fin: 23, ratio: 15 },
        { nombre: "Madrugada", inicio: 0, fin: 5, ratio: 15 }
    ]
};

// 2. NAVEGACIÓN ENTRE PANTALLAS
function mostrarSeccion(seccion) {
    if (seccion === 'ajustes') {
        document.getElementById('seccion-calculadora').classList.add('d-none');
        document.getElementById('seccion-ajustes').classList.remove('d-none');
        cargarDatosEnPantallaAjustes();
    } else {
        document.getElementById('seccion-ajustes').classList.add('d-none');
        document.getElementById('seccion-calculadora').classList.remove('d-none');
    }
}

// 3. CARGAR DATOS EN LOS CAMPOS DE AJUSTES
function cargarDatosEnPantallaAjustes() {
    document.getElementById('cfgObjetivo').value = config.objetivo;
    document.getElementById('cfgSensibilidad').value = config.sensibilidad;
    
    const contenedor = document.getElementById('lista-ratios-ajustes');
    contenedor.innerHTML = ""; // Limpiar antes de llenar

    config.franjas.forEach((f, index) => {
        contenedor.innerHTML += `
            <div class="mb-2 p-2 border rounded">
                <label class="small">${f.nombre} (${f.inicio}:00 - ${f.fin}:59)</label>
                <input type="number" class="form-control ratio-input" data-index="${index}" value="${f.ratio}">
            </div>
        `;
    });
}

// 4. GUARDAR LOS CAMBIOS EN LA MEMORIA (LocalStorage)
function guardarAjustes() {
    config.objetivo = parseFloat(document.getElementById('cfgObjetivo').value);
    config.sensibilidad = parseFloat(document.getElementById('cfgSensibilidad').value);
    
    // Guardar los nuevos ratios
    const inputs = document.querySelectorAll('.ratio-input');
    inputs.forEach(input => {
        const index = input.getAttribute('data-index');
        config.franjas[index].ratio = parseFloat(input.value);
    });

    localStorage.setItem('dt1_config', JSON.stringify(config));
    alert("Configuración guardada correctamente");
    mostrarSeccion('calculadora');
}

// 5. CÁLCULO ACTUALIZADO
function obtenerRatioActual() {
    const hora = new Date().getHours();
    const franja = config.franjas.find(f => hora >= f.inicio && hora <= f.fin);
    return franja ? franja.ratio : 15;
}

function ejecutarCalculo() {
    const g = parseFloat(document.getElementById('inputGlicemia').value);
    const c = parseFloat(document.getElementById('inputCarbos').value);
    
    if (!g || !c) return alert("Ingresa datos");

    const ratio = obtenerRatioActual();
    const correccion = (g - config.objetivo) / config.sensibilidad;
    const dosisComida = c / ratio;
    
    let total = correccion + dosisComida;
    const dosisFinal = Math.max(0, Math.round(total * 2) / 2);

    document.getElementById('valorDosis').innerText = dosisFinal + " U";
    document.getElementById('detalleTexto').innerText = `Ratio: 1u/${ratio}g | Objetivo: ${config.objetivo}`;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}
