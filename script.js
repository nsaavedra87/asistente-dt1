let config = JSON.parse(localStorage.getItem('dt1_v5_config')) || {
    comidas: [
        { nombre: "Desayuno", inicio: 6, fin: 11, ratioCarbos: 10, escalas: [{ min: 0, max: 150, dosis: 0 }] },
        { nombre: "Almuerzo", inicio: 12, fin: 17, ratioCarbos: 15, escalas: [{ min: 0, max: 150, dosis: 0 }] },
        { nombre: "Cena", inicio: 19, fin: 23, ratioCarbos: 12, escalas: [{ min: 0, max: 140, dosis: 0 }] }
    ]
};

let historial = JSON.parse(localStorage.getItem('dt1_historial')) || [];
let scannerActivo = false;
let alimentoTemporal = null;
let totalCarbosActual = 0;

// BASE DE DATOS LOCAL DE EJEMPLO
const baseAlimentos = [
    { n: "Pan de Molde", c: 15, p: "1 rebanada" },
    { n: "Arroz Cocido", c: 45, p: "1 taza" },
    { n: "Manzana", c: 15, p: "1 unidad mediana" },
    { n: "Leche", c: 12, p: "1 taza (240ml)" },
    { n: "Galletas Soda", c: 10, p: "3 unidades" },
    { n: "Pasta Cocida", c: 40, p: "1 taza" }
];

// 1. MANEJO DE SELECCIÓN Y PORCIONES
function buscarAlimento() {
    const t = document.getElementById('buscadorAlimento').value.toLowerCase();
    const s = document.getElementById('sugerenciasAlimentos');
    s.innerHTML = "";
    if (t.length < 2) return;

    baseAlimentos.filter(a => a.n.toLowerCase().includes(t)).forEach(a => {
        const b = document.createElement('button');
        b.className = "list-group-item list-group-item-action text-start";
        b.innerHTML = `<div><strong>${a.n}</strong></div><small class="text-muted">Porción: ${a.p} (${a.c}g carbos)</small>`;
        b.onclick = () => abrirModalPorciones(a);
        s.appendChild(b);
    });
}

function abrirModalPorciones(alimento) {
    alimentoTemporal = alimento;
    document.getElementById('modalTitulo').innerText = alimento.n;
    document.getElementById('modalInfo').innerText = `Porción base: ${alimento.p} (${alimento.c}g de carbohidratos).`;
    document.getElementById('inputCantidadPorcion').value = 1;
    document.getElementById('modalPorciones').classList.remove('d-none');
    document.getElementById('sugerenciasAlimentos').innerHTML = "";
    document.getElementById('buscadorAlimento').value = "";
}

function confirmarAgregarAlimento() {
    const cant = parseFloat(document.getElementById('inputCantidadPorcion').value);
    if (isNaN(cant) || cant <= 0) return alert("Ingresa una cantidad válida");

    const carbosCalculados = Math.round(alimentoTemporal.c * cant);
    totalCarbosActual += carbosCalculados;

    // Actualizar UI
    document.getElementById('inputCarbos').value = totalCarbosActual;
    document.getElementById('comida-actual').classList.remove('d-none');
    const li = document.createElement('li');
    li.className = "border-bottom py-1 d-flex justify-content-between";
    li.innerHTML = `<span>${cant}x ${alimentoTemporal.n} <small>(${alimentoTemporal.p})</small></span> <strong>${carbosCalculados}g</strong>`;
    document.getElementById('lista-porciones').appendChild(li);

    cerrarModal();
}

function cerrarModal() {
    document.getElementById('modalPorciones').classList.add('d-none');
    alimentoTemporal = null;
}

// 2. LÓGICA DE CÁLCULO (ESCALA + RATIO)
function ejecutarCalculo() {
    const glicemia = parseFloat(document.getElementById('inputGlicemia').value);
    const carbos = totalCarbosActual;
    
    if (isNaN(glicemia)) return alert("Ingresa tu glicemia actual");

    const comida = obtenerComidaActual();
    const rango = comida.escalas.find(r => glicemia >= r.min && glicemia <= r.max);
    const dosisCorreccion = rango ? rango.dosis : 0;
    const dosisCarbos = carbos / comida.ratioCarbos;
    const final = Math.round((dosisCorreccion + dosisCarbos) * 2) / 2;

    window.temporal = {
        fecha: new Date(), dosis: final, glicemia, carbos,
        detalle: `• Escala Glicemia: <strong>+${dosisCorreccion} U</strong><br>• Por Carbos (${carbos}g): <strong>+${dosisCarbos.toFixed(1)} U</strong>`
    };

    document.getElementById('valorDosis').innerText = final + " U";
    document.getElementById('detalleCalculo').innerHTML = window.temporal.detalle;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}

// 3. CONFIGURACIÓN DINÁMICA DE TABLAS
function cargarAjustesUI() {
    const cont = document.getElementById('config-comidas-container');
    cont.innerHTML = "";
    config.comidas.forEach((comida, cIdx) => {
        let escalasHtml = comida.escalas.map((e, eIdx) => `
            <div class="row g-1 mb-2 align-items-center bg-light p-1 rounded">
                <div class="col-4"><input type="number" class="form-control form-control-sm text-center" value="${e.min}" onchange="upd(${cIdx},${eIdx},'min',this.value)"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm text-center" value="${e.max}" onchange="upd(${cIdx},${eIdx},'max',this.value)"></div>
                <div class="col-3"><input type="number" class="form-control form-control-sm text-center fw-bold border-primary" value="${e.dosis}" onchange="upd(${cIdx},${eIdx},'dosis',this.value)"></div>
                <div class="col-1"><button class="btn btn-sm text-danger" onclick="eliminarFila(${cIdx},${eIdx})">✕</button></div>
            </div>`).join('');

        cont.innerHTML += `
            <div class="config-comida shadow-sm">
                <div class="d-flex justify-content-between mb-2">
                    <h6 class="fw-bold text-primary">${comida.nombre}</h6>
                    <button class="btn btn-sm btn-link" onclick="agregarFila(${cIdx})">+ Añadir Rango</button>
                </div>
                <div class="row mb-3"><div class="col-12"><label class="x-small fw-bold">Ratio (1U : X gramos carbos)</label><input type="number" class="form-control" value="${comida.ratioCarbos}" onchange="config.comidas[${cIdx}].ratioCarbos=parseFloat(this.value)"></div></div>
                <div class="x-small text-muted mb-1 d-flex justify-content-around"><span>Min</span><span>Max</span><span>Insulina</span></div>
                ${escalasHtml}
            </div>`;
    });
}

// FUNCIONES AUXILIARES
function upd(cI, eI, f, v) { config.comidas[cI].escalas[eI][f] = parseFloat(v); }
function agregarFila(cI) { config.comidas[cI].escalas.push({min:0, max:0, dosis:0}); cargarAjustesUI(); }
function eliminarFila(cI, eI) { config.comidas[cI].escalas.splice(eI, 1); cargarAjustesUI(); }
function guardarAjustes() { localStorage.setItem('dt1_v5_config', JSON.stringify(config)); alert("Guardado"); mostrarSeccion('calculadora'); }

function obtenerComidaActual() {
    const h = new Date().getHours();
    return config.comidas.find(c => h >= c.inicio && h <= c.fin) || config.comidas[0];
}

function mostrarSeccion(s) {
    document.querySelectorAll('[id^="seccion-"]').forEach(el => el.classList.add('d-none'));
    document.getElementById('seccion-' + s).classList.remove('d-none');
    if(s === 'calculadora') document.getElementById('txt-comida-actual').innerText = obtenerComidaActual().nombre;
    if(s === 'ajustes') cargarAjustesUI();
    if(s === 'historial') renderHistorial();
}

function renderHistorial() {
    document.getElementById('listaHistorial').innerHTML = historial.map(i => `
        <div class="card p-3 mb-2 border-start border-primary border-4 shadow-sm">
            <div class="d-flex justify-content-between"><strong>${new Date(i.fecha).toLocaleTimeString()}</strong><span class="badge bg-primary">${i.dosis}U</span></div>
            <div class="x-small">Glicemia: ${i.glicemia} | Carbos: ${i.carbos}g</div>
        </div>`).join('');
}

function limpiarSeleccion() { totalCarbosActual=0; document.getElementById('inputCarbos').value=0; document.getElementById('lista-porciones').innerHTML=""; document.getElementById('comida-actual').classList.add('d-none'); }
function confirmarInyeccion() { historial.unshift(window.temporal); localStorage.setItem('dt1_historial', JSON.stringify(historial)); alert("Registrado"); limpiarSeleccion(); document.getElementById('resultadoContainer').classList.add('d-none'); }

async function buscarGlobal(c) {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${c}.json`);
    const data = await res.json();
    if(data.status===1) {
        const p = data.product;
        abrirModalPorciones({ n: p.product_name, c: p.nutriments.carbohydrates_100g || 0, p: "100g" });
    }
}

function toggleScanner() {
    const v = document.getElementById('scanner-visual');
    if (!scannerActivo) {
        v.style.display = 'block';
        Quagga.init({ inputStream: { name: "Live", type: "LiveStream", target: v, constraints: { facingMode: "environment" } }, decoder: { readers: ["ean_reader"] } }, (err) => { Quagga.start(); scannerActivo = true; });
        Quagga.onDetected((d) => { buscarGlobal(d.codeResult.code); Quagga.stop(); v.style.display='none'; scannerActivo=false; });
    } else { Quagga.stop(); v.style.display='none'; scannerActivo=false; }
}

mostrarSeccion('calculadora');
