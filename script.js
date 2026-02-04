// 1. CONFIGURACIÓN Y PERSISTENCIA
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
let carbosAcumulados = 0;

// 2. BASE DE DATOS DE ALIMENTOS
const baseAlimentos = [
    { nombre: "Arroz Blanco", carbos: 45, porcion: "1 taza cocida" },
    { nombre: "Pan de Molde", carbos: 15, porcion: "1 rebanada" },
    { nombre: "Manzana Mediana", carbos: 15, porcion: "1 unidad" },
    { nombre: "Leche", carbos: 12, porcion: "240ml" },
    { nombre: "Pasta", carbos: 40, porcion: "1 taza" },
    { nombre: "Avena", carbos: 18, porcion: "1/2 taza" },
    { nombre: "Plátano", carbos: 25, porcion: "1 unidad" },
    { nombre: "Yogurt Natural", carbos: 10, porcion: "1 vaso" }
];

// 3. NAVEGACIÓN
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
        cargarDatosAjustes();
    }
}

// 4. LÓGICA DE INSULINA A BORDO (IOB)
function calcularIOB() {
    let iobTotal = 0;
    const ahora = new Date();
    historial.forEach(reg => {
        const diff = (ahora - new Date(reg.fecha)) / (1000 * 60 * 60);
        if (diff < config.duracionInsulina) {
            iobTotal += reg.dosis * (1 - (diff / config.duracionInsulina));
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

// 5. BUSCADOR DE ALIMENTOS
function buscarAlimento() {
    const txt = document.getElementById('buscadorAlimento').value.toLowerCase();
    const sug = document.getElementById('sugerenciasAlimentos');
    sug.innerHTML = "";
    if (txt.length < 2) return;

    const filtrados = baseAlimentos.filter(a => a.nombre.toLowerCase().includes(txt));
    filtrados.forEach(a => {
        const btn = document.createElement('button');
        btn.className = "list-group-item list-group-item-action food-item";
        btn.innerHTML = `<strong>${a.nombre}</strong> <small>(${a.porcion})</small> <span class="badge bg-secondary float-end">${a.carbos}g</span>`;
        btn.onclick = () => agregarAlimento(a);
        sug.appendChild(btn);
    });

    if (filtrados.length === 0) {
        const btnGlobal = document.createElement('button');
        btnGlobal.className = "list-group-item list-group-item-action list-group-item-info";
        btnGlobal.innerText = "🔍 Buscar en base de datos mundial...";
        btnGlobal.onclick = () => buscarGlobal(txt);
        sug.appendChild(btnGlobal);
    }
}

function agregarAlimento(a) {
    carbosAcumulados += a.carbos;
    document.getElementById('inputCarbos').value = carbosAcumulados;
    document.getElementById('comida-actual').classList.remove('d-none');
    const li = document.createElement('li');
    li.innerHTML = `✅ ${a.nombre} <span class="float-end">${a.carbos}g</span>`;
    document.getElementById('lista-porciones').appendChild(li);
    document.getElementById('suma-carbos-display').innerText = carbosAcumulados;
    document.getElementById('buscadorAlimento').value = "";
    document.getElementById('sugerenciasAlimentos').innerHTML = "";
}

async function buscarGlobal(txt) {
    document.getElementById('sugerenciasAlimentos').innerHTML = "<div class='p-2'>Buscando...</div>";
    try {
        const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${txt}&json=1&page_size=5`);
        const data = await res.json();
        const sug = document.getElementById('sugerenciasAlimentos');
        sug.innerHTML = "";
        data.products.forEach(p => {
            const ch = p.nutriments.carbohydrates_100g || 0;
            const btn = document.createElement('button');
            btn.className = "list-group-item list-group-item-action";
            btn.innerHTML = `<strong>${p.product_name}</strong><br><small>${ch}g/100g</small>`;
            btn.onclick = () => {
                const g = prompt("¿Gramos a comer?", "100");
                if (g) agregarAlimento({ nombre: p.product_name, carbos: Math.round((ch * g) / 100), porcion: g + "g" });
            };
            sug.appendChild(btn);
        });
    } catch (e) { alert("Error de conexión"); }
}

function limpiarSeleccion() {
    carbosAcumulados = 0;
    document.getElementById('inputCarbos').value = "";
    document.getElementById('lista-porciones').innerHTML = "";
    document.getElementById('comida-actual').classList.add('d-none');
    document.getElementById('suma-carbos-display').innerText = "0";
}

// 6. CÁLCULO
function ejecutarCalculo() {
    const g = parseFloat(document.getElementById('inputGlicemia').value);
    const c = parseFloat(document.getElementById('inputCarbos').value);
    if (isNaN(g) || isNaN(c)) return alert("Completa los datos");

    const hora = new Date().getHours();
    const ratio = (config.franjas.find(f => hora >= f.inicio && hora <= f.fin) || {ratio:15}).ratio;
    const iob = calcularIOB();
    
    const dosis = ((g - config.objetivo) / config.sensibilidad) + (c / ratio) - iob;
    const final = Math.max(0, Math.round(dosis * 2) / 2);

    window.temporal = { fecha: new Date(), dosis: final, glicemia: g, carbos: c, iobRestada: iob.toFixed(1) };
    document.getElementById('valorDosis').innerText = final + " U";
    document.getElementById('detalleTexto').innerText = `Ratio: 1:${ratio} | IOB: -${iob.toFixed(1)}U`;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}

function confirmarInyeccion() {
    historial.unshift(window.temporal);
    localStorage.setItem('dt1_historial', JSON.stringify(historial));
    document.getElementById('resultadoContainer').classList.add('d-none');
    limpiarSeleccion();
    document.getElementById('inputGlicemia').value = "";
    alert("Guardado!");
    actualizarIOBDisplay();
}

// 7. HISTORIAL Y AJUSTES
function renderizarHistorial() {
    const cont = document.getElementById('listaHistorial');
    cont.innerHTML = historial.length === 0 ? "<p class='text-muted p-3'>No hay registros hoy.</p>" : "";
    historial.forEach(h => {
        const d = new Date(h.fecha);
        cont.innerHTML += `
            <div class="card p-2 historial-card shadow-sm">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="small fw-bold">${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    <span class="badge bg-primary fs-6">${h.dosis} U</span>
                </div>
                <div class="small text-muted">G: ${h.glicemia} | C: ${h.carbos}g | IOB: -${h.iobRestada}U</div>
            </div>`;
    });
}

function cargarDatosAjustes() {
    document.getElementById('cfgObjetivo').value = config.objetivo;
    document.getElementById('cfgSensibilidad').value = config.sensibilidad;
    document.getElementById('cfgDuracion').value = config.duracionInsulina;
    const l = document.getElementById('lista-ratios-ajustes');
    l.innerHTML = "";
    config.franjas.forEach((f, i) => {
        l.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small">${f.nombre}</span>
                <input type="number" class="form-control form-control-sm w-25 r-in" data-i="${i}" value="${f.ratio}">
            </div>`;
    });
}

function guardarAjustes() {
    config.objetivo = parseFloat(document.getElementById('cfgObjetivo').value);
    config.sensibilidad = parseFloat(document.getElementById('cfgSensibilidad').value);
    config.duracionInsulina = parseFloat(document.getElementById('cfgDuracion').value);
    document.querySelectorAll('.r-in').forEach(input => {
        config.franjas[input.dataset.i].ratio = parseFloat(input.value);
    });
    localStorage.setItem('dt1_config', JSON.stringify(config));
    mostrarSeccion('calculadora');
}

function modoRescate() {
    const g = prompt("Glicemia actual:");
    if (!g) return;
    if (g < 55) alert("🚨 CRÍTICO: 30g de carbos rápidos y pide ayuda.");
    else if (g < 70) alert("📉 LEVE: 15g de carbos rápidos y espera 15 min.");
    else alert("Glicemia fuera de rango de peligro.");
}

function borrarHistorial() { if(confirm("¿Borrar todo?")) { historial=[]; localStorage.removeItem('dt1_historial'); renderizarHistorial(); } }

actualizarIOBDisplay();
