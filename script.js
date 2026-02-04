// 1. CONFIGURACIÓN INICIAL
let config = JSON.parse(localStorage.getItem('dt1_v4_config')) || {
    comidas: [
        { 
            nombre: "Desayuno", inicio: 6, fin: 11, ratioCarbos: 10,
            escalas: [{ min: 0, max: 150, dosis: 0 }, { min: 151, max: 200, dosis: 2 }]
        },
        { 
            nombre: "Almuerzo", inicio: 12, fin: 17, ratioCarbos: 15,
            escalas: [{ min: 0, max: 150, dosis: 0 }]
        },
        { 
            nombre: "Cena", inicio: 19, fin: 23, ratioCarbos: 12,
            escalas: [{ min: 0, max: 140, dosis: 0 }]
        }
    ]
};

let historial = JSON.parse(localStorage.getItem('dt1_historial')) || [];
let scannerActivo = false;

// 2. NAVEGACIÓN
function mostrarSeccion(s) {
    document.querySelectorAll('[id^="seccion-"]').forEach(el => el.classList.add('d-none'));
    document.getElementById('seccion-' + s).classList.remove('d-none');
    if(s === 'calculadora') {
        document.getElementById('txt-comida-actual').innerText = obtenerComidaActual().nombre;
    }
    if(s === 'ajustes') cargarAjustesUI();
    if(s === 'historial') renderHistorial();
}

function obtenerComidaActual() {
    const hora = new Date().getHours();
    return config.comidas.find(c => hora >= c.inicio && hora <= c.fin) || config.comidas[0];
}

// 3. GESTIÓN DINÁMICA DE RANGOS (AJUSTES)
function cargarAjustesUI() {
    const cont = document.getElementById('config-comidas-container');
    cont.innerHTML = "";
    
    config.comidas.forEach((comida, cIdx) => {
        let tablaHtml = comida.escalas.map((e, eIdx) => `
            <div class="row g-1 mb-2 rango-fila align-items-center">
                <div class="col-4"><input type="number" class="form-control form-control-sm text-center" value="${e.min}" placeholder="Min" onchange="config.comidas[${cIdx}].escalas[${eIdx}].min=parseFloat(this.value)"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm text-center" value="${e.max}" placeholder="Max" onchange="config.comidas[${cIdx}].escalas[${eIdx}].max=parseFloat(this.value)"></div>
                <div class="col-3"><input type="number" class="form-control form-control-sm text-center fw-bold border-primary" value="${e.dosis}" placeholder="+U" onchange="config.comidas[${cIdx}].escalas[${eIdx}].dosis=parseFloat(this.value)"></div>
                <div class="col-1 text-end"><button class="btn btn-sm text-danger p-0" onclick="eliminarFila(${cIdx}, ${eIdx})">✕</button></div>
            </div>
        `).join('');

        cont.innerHTML += `
            <div class="config-comida shadow-sm">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold text-primary mb-0">${comida.nombre}</h5>
                    <button class="btn btn-sm btn-outline-primary fw-bold" onclick="agregarFila(${cIdx})">+ Añadir Rango</button>
                </div>
                <div class="mb-3 bg-light p-2 rounded">
                    <label class="x-small fw-bold text-muted">Ratio Carbohidratos (1U : X gramos)</label>
                    <input type="number" class="form-control border-success" value="${comida.ratioCarbos}" onchange="config.comidas[${cIdx}].ratioCarbos=parseFloat(this.value)">
                </div>
                <div class="row g-1 text-center x-small fw-bold text-muted mb-1"><div class="col-4">Desde</div><div class="col-4">Hasta</div><div class="col-4">Insulina</div></div>
                ${tablaHtml}
            </div>`;
    });
}

function agregarFila(cIdx) {
    config.comidas[cIdx].escalas.push({ min: 0, max: 0, dosis: 0 });
    cargarAjustesUI();
}

function eliminarFila(cIdx, eIdx) {
    config.comidas[cIdx].escalas.splice(eIdx, 1);
    cargarAjustesUI();
}

function guardarAjustes() {
    localStorage.setItem('dt1_v4_config', JSON.stringify(config));
    alert("✅ Configuración guardada correctamente.");
    mostrarSeccion('calculadora');
}

// 4. LÓGICA DE CÁLCULO
function ejecutarCalculo() {
    const glicemia = parseFloat(document.getElementById('inputGlicemia').value);
    const carbos = parseFloat(document.getElementById('inputCarbos').value);
    
    if (isNaN(glicemia) || isNaN(carbos)) return alert("Ingresa datos válidos");

    const comida = obtenerComidaActual();
    const rango = comida.escalas.find(r => glicemia >= r.min && glicemia <= r.max);
    const dosisCorreccion = rango ? rango.dosis : 0;
    const dosisCarbos = carbos / comida.ratioCarbos;
    const total = dosisCorreccion + dosisCarbos;
    const final = Math.round(total * 2) / 2;

    window.temporal = {
        fecha: new Date(), dosis: final, glicemia, carbos,
        detalle: `• Corrección (Escala): <strong>${dosisCorreccion} U</strong><br>• Comida (${carbos}g / ratio ${comida.ratioCarbos}): <strong>${dosisCarbos.toFixed(1)} U</strong>`
    };

    document.getElementById('valorDosis').innerText = final + " U";
    document.getElementById('detalleCalculo').innerHTML = window.temporal.detalle;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}

function confirmarInyeccion() {
    historial.unshift(window.temporal);
    localStorage.setItem('dt1_historial', JSON.stringify(historial));
    document.getElementById('resultadoContainer').classList.add('d-none');
    alert("Guardado!");
}

// 5. ESCÁNER Y BUSCADOR (IDEM ANTERIOR)
function toggleScanner() {
    const v = document.getElementById('scanner-visual');
    if (!scannerActivo) {
        v.style.display = 'block';
        Quagga.init({
            inputStream: { name: "Live", type: "LiveStream", target: v, constraints: { facingMode: "environment" } },
            decoder: { readers: ["ean_reader"] }
        }, (err) => { Quagga.start(); scannerActivo = true; });
        Quagga.onDetected((d) => { buscarGlobal(d.codeResult.code); Quagga.stop(); v.style.display='none'; scannerActivo=false; });
    } else { Quagga.stop(); v.style.display='none'; scannerActivo=false; }
}

async function buscarGlobal(c) {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${c}.json`);
    const data = await res.json();
    if(data.status===1) {
        const ch = data.product.nutriments.carbohydrates_100g || 0;
        const g = prompt(`${data.product.product_name}\n${ch}g carbos/100g\n¿Gramos?`, "100");
        if(g) document.getElementById('inputCarbos').value = Math.round((ch*g)/100);
    }
}

function buscarAlimento() {
    const t = document.getElementById('buscadorAlimento').value.toLowerCase();
    const s = document.getElementById('sugerenciasAlimentos');
    s.innerHTML = "";
    if (t.length < 2) return;
    const base = [{n:"Pan",c:15},{n:"Arroz",c:45},{n:"Plátano",c:25}];
    base.filter(a => a.n.toLowerCase().includes(t)).forEach(a => {
        const b = document.createElement('button');
        b.className="list-group-item list-group-item-action";
        b.innerHTML=`${a.n} <span class="badge bg-secondary float-end">${a.c}g</span>`;
        b.onclick=()=>{
            document.getElementById('inputCarbos').value = a.c;
            s.innerHTML="";
        };
        s.appendChild(b);
    });
}

function renderHistorial() {
    document.getElementById('listaHistorial').innerHTML = historial.map(i => `
        <div class="card p-3 mb-2 border-start border-primary border-4 shadow-sm">
            <div class="d-flex justify-content-between"><strong>${new Date(i.fecha).toLocaleTimeString()}</strong><span class="badge bg-primary">${i.dosis}U</span></div>
            <div class="small">G: ${i.glicemia} | C: ${i.carbos}g</div>
        </div>`).join('');
}

function limpiarSeleccion() { document.getElementById('inputCarbos').value=""; }
mostrarSeccion('calculadora');
