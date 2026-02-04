let config = JSON.parse(localStorage.getItem('dt1_config')) || {
    objetivo: 100, sensibilidad: 50, duracionInsulina: 3,
    franjas: [
        { nombre: "Mañana", inicio: 6, fin: 11, ratio: 10 },
        { nombre: "Tarde", inicio: 12, fin: 18, ratio: 12 },
        { nombre: "Noche", inicio: 19, fin: 23, ratio: 15 },
        { nombre: "Madrugada", inicio: 0, fin: 5, ratio: 15 }
    ]
};

let historial = JSON.parse(localStorage.getItem('dt1_historial')) || [];
let carbosAcumulados = 0;
let scannerActivo = false;

// --- LÓGICA DE ESCÁNER (FOTOS/CÓDIGO DE BARRAS) ---
function toggleScanner() {
    const v = document.getElementById('scanner-visual');
    if (!scannerActivo) {
        v.style.display = 'block';
        Quagga.init({
            inputStream: { name: "Live", type: "LiveStream", target: v, constraints: { facingMode: "environment" } },
            decoder: { readers: ["ean_reader", "ean_8_reader", "upc_reader"] }
        }, (err) => {
            if (err) { alert("Error cámara: " + err); return; }
            Quagga.start();
            scannerActivo = true;
        });

        Quagga.onDetected((data) => {
            const code = data.codeResult.code;
            Quagga.stop();
            v.style.display = 'none';
            scannerActivo = false;
            buscarGlobalPorCodigo(code);
        });
    } else {
        Quagga.stop();
        v.style.display = 'none';
        scannerActivo = false;
    }
}

async function buscarGlobalPorCodigo(codigo) {
    document.getElementById('buscadorAlimento').value = "Buscando código...";
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`);
        const data = await res.json();
        if (data.status === 1) {
            const p = data.product;
            const ch = p.nutriments.carbohydrates_100g || 0;
            const nombre = p.product_name || "Producto desconocido";
            const g = prompt(`Encontrado: ${nombre}\n${ch}g carbos por 100g.\n¿Gramos a consumir?`, "100");
            if (g) agregarAlimento({ nombre, carbos: Math.round((ch * g) / 100), porcion: g + "g" });
        } else { alert("Producto no encontrado en base de datos."); }
    } catch (e) { alert("Error de red."); }
    document.getElementById('buscadorAlimento').value = "";
}

// --- RESTO DE FUNCIONES ---
function buscarAlimento() {
    const txt = document.getElementById('buscadorAlimento').value.toLowerCase();
    const sug = document.getElementById('sugerenciasAlimentos');
    sug.innerHTML = "";
    if (txt.length < 2) return;

    const baseLocal = [{nombre:"Pan",carbos:15,porcion:"1 rebanada"},{nombre:"Arroz",carbos:45,porcion:"1 taza"},{nombre:"Manzana",carbos:15,porcion:"1 unidad"}];
    const filtrados = baseLocal.filter(a => a.nombre.toLowerCase().includes(txt));
    
    filtrados.forEach(a => {
        const btn = document.createElement('button');
        btn.className="list-group-item list-group-item-action";
        btn.innerHTML=`${a.nombre} <span class="badge bg-secondary float-end">${a.carbos}g</span>`;
        btn.onclick=()=>agregarAlimento(a);
        sug.appendChild(btn);
    });
}

function agregarAlimento(a) {
    carbosAcumulados += a.carbos;
    document.getElementById('inputCarbos').value = carbosAcumulados;
    document.getElementById('comida-actual').classList.remove('d-none');
    const li = document.createElement('li');
    li.innerHTML = `✅ ${a.nombre} <span class="float-end">${a.carbos}g</span>`;
    document.getElementById('lista-porciones').appendChild(li);
    document.getElementById('suma-carbos-display').innerText = carbosAcumulados;
    document.getElementById('sugerenciasAlimentos').innerHTML = "";
    document.getElementById('buscadorAlimento').value = "";
}

function calcularIOB() {
    let total = 0;
    const ahora = new Date();
    historial.forEach(r => {
        const diff = (ahora - new Date(r.fecha)) / 3600000;
        if (diff < config.duracionInsulina) total += r.dosis * (1 - (diff / config.duracionInsulina));
    });
    return total;
}

function ejecutarCalculo() {
    const g = parseFloat(document.getElementById('inputGlicemia').value);
    const c = parseFloat(document.getElementById('inputCarbos').value);
    if (isNaN(g) || isNaN(c)) return alert("Faltan datos");

    const ratio = (config.franjas.find(f => new Date().getHours() >= f.inicio && new Date().getHours() <= f.fin) || {ratio:15}).ratio;
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
    limpiarSeleccion(); document.getElementById('inputGlicemia').value = "";
    actualizarIOBDisplay(); alert("Guardado en bitácora");
}

function actualizarIOBDisplay() {
    const iob = calcularIOB();
    document.getElementById('display-iob').className = iob > 0.1 ? "iob-badge" : "d-none";
    document.getElementById('valor-iob-actual').innerText = iob.toFixed(1);
}

function mostrarSeccion(s) {
    ['seccion-calculadora','seccion-historial','seccion-ajustes','btn-sos'].forEach(id => document.getElementById(id).classList.add('d-none'));
    document.getElementById('seccion-' + s).classList.remove('d-none');
    if(s==='calculadora') { document.getElementById('btn-sos').classList.remove('d-none'); actualizarIOBDisplay(); }
    if(s==='historial') renderizarHistorial();
    if(s==='ajustes') cargarAjustes();
}

function renderizarHistorial() {
    const h = document.getElementById('listaHistorial');
    h.innerHTML = historial.map(i => `<div class="card p-2 mb-2 border-start border-primary border-4 shadow-sm">
        <div class="d-flex justify-content-between"><strong>${new Date(i.fecha).toLocaleTimeString()}</strong><span class="badge bg-primary">${i.dosis}U</span></div>
        <small>G: ${i.glicemia} | C: ${i.carbos}g | IOB: -${i.iobRestada}</small></div>`).join('');
}

function cargarAjustes() {
    document.getElementById('cfgObjetivo').value = config.objetivo;
    document.getElementById('cfgSensibilidad').value = config.sensibilidad;
    document.getElementById('cfgDuracion').value = config.duracionInsulina;
    const l = document.getElementById('lista-ratios-ajustes');
    l.innerHTML = config.franjas.map((f, i) => `<div class="d-flex mb-1"><span class="small w-50">${f.nombre}</span><input type="number" class="form-control form-control-sm rin" data-i="${i}" value="${f.ratio}"></div>`).join('');
}

function guardarAjustes() {
    config.objetivo = parseFloat(document.getElementById('cfgObjetivo').value);
    config.sensibilidad = parseFloat(document.getElementById('cfgSensibilidad').value);
    config.duracionInsulina = parseFloat(document.getElementById('cfgDuracion').value);
    document.querySelectorAll('.rin').forEach(n => config.franjas[n.dataset.i].ratio = parseFloat(n.value));
    localStorage.setItem('dt1_config', JSON.stringify(config));
    mostrarSeccion('calculadora');
}

function limpiarSeleccion() { carbosAcumulados=0; document.getElementById('inputCarbos').value=""; document.getElementById('lista-porciones').innerHTML=""; document.getElementById('comida-actual').classList.add('d-none'); }
function modoRescate() { const g = prompt("Glicemia:"); if(g<70) alert("Toma 15g de carbos rápidos!"); }
function borrarHistorial() { if(confirm("¿Borrar?")) { historial=[]; localStorage.removeItem('dt1_historial'); renderizarHistorial(); } }

actualizarIOBDisplay();
