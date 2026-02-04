// 1. CONFIGURACIÓN ESTRUCTURADA POR COMIDAS
let config = JSON.parse(localStorage.getItem('dt1_config_v2')) || {
    comidas: [
        { 
            nombre: "Desayuno", inicio: 6, fin: 10, ratio: 10,
            escalas: [
                { min: 0, max: 150, dosis: 0 },
                { min: 151, max: 200, dosis: 2 },
                { min: 201, max: 250, dosis: 4 },
                { min: 251, max: 999, dosis: 6 }
            ]
        },
        { 
            nombre: "Almuerzo", inicio: 12, fin: 16, ratio: 15,
            escalas: [
                { min: 0, max: 150, dosis: 0 },
                { min: 151, max: 250, dosis: 2 },
                { min: 251, max: 999, dosis: 4 }
            ]
        },
        { 
            nombre: "Once/Cena", inicio: 18, fin: 23, ratio: 12,
            escalas: [
                { min: 0, max: 140, dosis: 0 },
                { min: 141, max: 200, dosis: 1 },
                { min: 201, max: 999, dosis: 3 }
            ]
        }
    ]
};

let historial = JSON.parse(localStorage.getItem('dt1_historial')) || [];
let carbosAcumulados = 0;
let scannerActivo = false;

// 2. DETECTAR COMIDA ACTUAL POR HORA
function obtenerComidaActual() {
    const hora = new Date().getHours();
    return config.comidas.find(c => hora >= c.inicio && hora <= c.fin) || config.comidas[0];
}

// 3. LÓGICA DE CÁLCULO (ESCALA MÓVIL + CARBOS)
function ejecutarCalculo() {
    const glicemia = parseFloat(document.getElementById('inputGlicemia').value);
    const carbos = parseFloat(document.getElementById('inputCarbos').value);
    
    if (isNaN(glicemia) || isNaN(carbos)) return alert("Ingresa Glicemia y Carbohidratos");

    const comida = obtenerComidaActual();
    
    // A. Dosis por Escala Móvil (Rangos de Glicemia)
    const rango = comida.escalas.find(r => glicemia >= r.min && glicemia <= r.max);
    const dosisCorreccion = rango ? rango.dosis : 0;

    // B. Dosis por Carbohidratos
    const dosisCarbos = carbos / comida.ratio;

    // C. Suma Total y Redondeo para Pluma
    const total = dosisCorreccion + dosisCarbos;
    const final = Math.round(total * 2) / 2;

    window.temporal = { 
        fecha: new Date(), 
        dosis: final, 
        glicemia, 
        carbos, 
        detalle: `Corrección: ${dosisCorreccion}U + Carbos: ${dosisCarbos.toFixed(1)}U` 
    };

    document.getElementById('valorDosis').innerText = final + " U";
    document.getElementById('detalleTexto').innerText = window.temporal.detalle;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}

// 4. GESTIÓN DE AJUSTES (TABLA DINÁMICA)
function cargarDatosAjustes() {
    const cont = document.getElementById('config-comidas-container');
    cont.innerHTML = "";
    
    config.comidas.forEach((comida, idx) => {
        let escalasHtml = comida.escalas.map((e, ei) => `
            <div class="row g-1 mb-1">
                <div class="col-4"><input type="number" class="form-control form-control-sm" value="${e.min}" onchange="updateE(${idx},${ei},'min',this.value)"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" value="${e.max}" onchange="updateE(${idx},${ei},'max',this.value)"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm border-success" value="${e.dosis}" onchange="updateE(${idx},${ei},'dosis',this.value)"></div>
            </div>
        `).join('');

        cont.innerHTML += `
            <div class="rango-input-group shadow-sm border-primary">
                <h6 class="fw-bold text-primary">${comida.nombre} <small class="text-muted">(Ratio: 1u/${comida.ratio}g)</small></h6>
                <div class="mb-2">
                    <label class="x-small">Ratio Carbos:</label>
                    <input type="number" class="form-control form-control-sm w-50" value="${comida.ratio}" onchange="config.comidas[${idx}].ratio=this.value">
                </div>
                <div class="row g-1 text-center x-small fw-bold"><div class="col-4">Min</div><div class="col-4">Max</div><div class="col-4">Insulina</div></div>
                ${escalasHtml}
            </div>`;
    });
}

function updateE(cIdx, eIdx, campo, valor) {
    config.comidas[cIdx].escalas[eIdx][campo] = parseFloat(valor);
}

function guardarAjustes() {
    localStorage.setItem('dt1_config_v2', JSON.stringify(config));
    alert("Configuración guardada");
    mostrarSeccion('calculadora');
}

// 5. NAVEGACIÓN Y OTROS
function mostrarSeccion(s) {
    document.getElementById('seccion-calculadora').classList.add('d-none');
    document.getElementById('seccion-historial').classList.add('d-none');
    document.getElementById('seccion-ajustes').classList.add('d-none');
    document.getElementById('seccion-' + s).classList.remove('d-none');
    if(s==='ajustes') cargarDatosAjustes();
    if(s==='calculadora') document.getElementById('nombre-comida-actual').innerText = obtenerComidaActual().nombre;
    if(s==='historial') renderHistorial();
}

function renderHistorial() {
    const h = document.getElementById('listaHistorial');
    h.innerHTML = historial.map(i => `
        <div class="card p-2 mb-2 border-start border-primary border-4 shadow-sm">
            <div class="d-flex justify-content-between"><strong>${new Date(i.fecha).toLocaleTimeString()}</strong><span class="badge bg-primary fs-6">${i.dosis}U</span></div>
            <small class="text-muted">Glicemia: ${i.glicemia} | Carbos: ${i.carbos}g</small>
            <div class="x-small text-info">${i.detalle}</div>
        </div>`).join('');
}

function confirmarInyeccion() {
    historial.unshift(window.temporal);
    localStorage.setItem('dt1_historial', JSON.stringify(historial));
    document.getElementById('resultadoContainer').classList.add('d-none');
    alert("Guardado!");
}

// Funciones de buscador y escáner (mismo que antes)
function toggleScanner() {
    const v = document.getElementById('scanner-visual');
    if (!scannerActivo) {
        v.style.display = 'block';
        Quagga.init({
            inputStream: { name: "Live", type: "LiveStream", target: v, constraints: { facingMode: "environment" } },
            decoder: { readers: ["ean_reader", "ean_8_reader"] }
        }, (err) => { Quagga.start(); scannerActivo = true; });
        Quagga.onDetected((d) => { buscarGlobalPorCodigo(d.codeResult.code); Quagga.stop(); v.style.display='none'; scannerActivo=false; });
    } else { Quagga.stop(); v.style.display='none'; scannerActivo=false; }
}

async function buscarGlobalPorCodigo(c) {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${c}.json`);
    const data = await res.json();
    if(data.status===1) {
        const ch = data.product.nutriments.carbohydrates_100g || 0;
        const g = prompt(`${data.product.product_name}\n${ch}g carbos/100g. ¿Gramos?`, "100");
        if(g) {
            const finalC = Math.round((ch*g)/100);
            document.getElementById('inputCarbos').value = (parseFloat(document.getElementById('inputCarbos').value)||0) + finalC;
            const li = document.createElement('li'); li.innerText = `✅ ${data.product.product_name}: ${finalC}g`;
            document.getElementById('lista-porciones').appendChild(li);
            document.getElementById('comida-actual').classList.remove('d-none');
        }
    }
}

function limpiarSeleccion() { document.getElementById('inputCarbos').value=""; document.getElementById('lista-porciones').innerHTML=""; document.getElementById('comida-actual').classList.add('d-none'); }

// Inicializar
mostrarSeccion('calculadora');
