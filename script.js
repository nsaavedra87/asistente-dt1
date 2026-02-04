// 1. CONFIGURACIÓN DINÁMICA
let config = JSON.parse(localStorage.getItem('dt1_v3_config')) || {
    comidas: [
        { 
            nombre: "Desayuno", inicio: 6, fin: 11,
            ratioCarbos: 10, // 1U por cada 10g
            escalas: [
                { min: 0, max: 150, dosis: 0 },
                { min: 151, max: 200, dosis: 2 },
                { min: 201, max: 250, dosis: 4 },
                { min: 251, max: 300, dosis: 6 },
                { min: 301, max: 999, dosis: 8 }
            ]
        },
        { 
            nombre: "Almuerzo", inicio: 12, fin: 17,
            ratioCarbos: 15, // 1U por cada 15g
            escalas: [
                { min: 0, max: 150, dosis: 0 },
                { min: 151, max: 250, dosis: 2 },
                { min: 251, max: 350, dosis: 4 }
            ]
        },
        { 
            nombre: "Cena", inicio: 19, fin: 23,
            ratioCarbos: 12,
            escalas: [
                { min: 0, max: 140, dosis: 0 },
                { min: 141, max: 200, dosis: 1 },
                { min: 201, max: 300, dosis: 3 }
            ]
        }
    ]
};

let historial = JSON.parse(localStorage.getItem('dt1_historial')) || [];
let scannerActivo = false;

// 2. DETECTAR COMIDA
function obtenerComidaActual() {
    const hora = new Date().getHours();
    return config.comidas.find(c => hora >= c.inicio && hora <= c.fin) || config.comidas[0];
}

// 3. LÓGICA DE CÁLCULO DOBLE
function ejecutarCalculo() {
    const glicemia = parseFloat(document.getElementById('inputGlicemia').value);
    const carbos = parseFloat(document.getElementById('inputCarbos').value);
    
    if (isNaN(glicemia) || isNaN(carbos)) return alert("Por favor, ingresa glicemia y carbohidratos.");

    const comida = obtenerComidaActual();

    // CALCULO 1: CORRECCIÓN (Escala de Glicemia)
    const rango = comida.escalas.find(r => glicemia >= r.min && glicemia <= r.max);
    const dosisCorreccion = rango ? rango.dosis : 0;

    // CALCULO 2: CARBOHIDRATOS (Ratio)
    const dosisCarbos = carbos / comida.ratioCarbos;

    // TOTAL
    const total = dosisCorreccion + dosisCarbos;
    const final = Math.round(total * 2) / 2; // Redondeo a 0.5 para pluma

    // Guardar para historial
    window.ultimoCalculo = {
        fecha: new Date(),
        dosis: final,
        glicemia,
        carbos,
        detalle: `• Corrección (Glicemia): <strong>${dosisCorreccion} U</strong><br>• Comida (${carbos}g / ratio ${comida.ratioCarbos}): <strong>${dosisCarbos.toFixed(1)} U</strong>`
    };

    document.getElementById('valorDosis').innerText = final + " U";
    document.getElementById('detalleCalculo').innerHTML = window.ultimoCalculo.detalle;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}

// 4. CONFIGURACIÓN EN PANTALLA
function cargarDatosAjustes() {
    const cont = document.getElementById('config-comidas-container');
    cont.innerHTML = "";
    
    config.comidas.forEach((comida, idx) => {
        let escalasHtml = comida.escalas.map((e, ei) => `
            <div class="row g-1 mb-1 align-items-center text-center">
                <div class="col-4"><input type="number" class="form-control form-control-sm" value="${e.min}" onchange="upd(${idx},${ei},'min',this.value)"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" value="${e.max}" onchange="upd(${idx},${ei},'max',this.value)"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm fw-bold border-primary" value="${e.dosis}" onchange="upd(${idx},${ei},'dosis',this.value)"></div>
            </div>
        `).join('');

        cont.innerHTML += `
            <div class="config-comida shadow-sm">
                <h6 class="fw-bold text-primary mb-3">${comida.nombre}</h6>
                <div class="mb-3 p-2 bg-light rounded">
                    <label class="small fw-bold">Ratio de Carbos (1U por cada X gramos):</label>
                    <input type="number" class="form-control border-success" value="${comida.ratioCarbos}" onchange="config.comidas[${idx}].ratioCarbos=parseFloat(this.value)">
                </div>
                <p class="x-small fw-bold text-muted mb-1 text-uppercase">Escala de Corrección (Glicemia):</p>
                <div class="row g-1 text-center x-small fw-bold mb-1"><div class="col-4">Desde</div><div class="col-4">Hasta</div><div class="col-4">Insulina</div></div>
                ${escalasHtml}
            </div>`;
    });
}

function upd(cI, eI, campo, v) { config.comidas[cI].escalas[eI][campo] = parseFloat(v); }

function guardarAjustes() {
    localStorage.setItem('dt1_v3_config', JSON.stringify(config));
    alert("✅ Configuración actualizada.");
    mostrarSeccion('calculadora');
}

// 5. NAVEGACIÓN Y EXTRAS
function mostrarSeccion(s) {
    ['calculadora','historial','ajustes'].forEach(id => document.getElementById('seccion-'+id).classList.add('d-none'));
    document.getElementById('seccion-'+s).classList.remove('d-none');
    if(s==='calculadora') document.getElementById('txt-comida-actual').innerText = "Horario: " + obtenerComidaActual().nombre;
    if(s==='ajustes') cargarDatosAjustes();
    if(s==='historial') renderHistorial();
}

function renderHistorial() {
    const h = document.getElementById('listaHistorial');
    h.innerHTML = historial.length ? historial.map(i => `
        <div class="card p-3 mb-2 border-start border-primary border-5">
            <div class="d-flex justify-content-between">
                <span class="small fw-bold text-muted">${new Date(i.fecha).toLocaleTimeString()}</span>
                <span class="badge bg-primary fs-6">${i.dosis} U</span>
            </div>
            <div class="small mt-1">Glicemia: <strong>${i.glicemia}</strong> | Carbos: <strong>${i.carbos}g</strong></div>
        </div>`).join('') : "<p class='text-muted text-center'>Sin registros hoy.</p>";
}

function confirmarInyeccion() {
    historial.unshift(window.ultimoCalculo);
    localStorage.setItem('dt1_historial', JSON.stringify(historial));
    document.getElementById('resultadoContainer').classList.add('d-none');
    document.getElementById('inputGlicemia').value = "";
    document.getElementById('inputCarbos').value = "";
    limpiarSeleccion();
    alert("Guardado correctamente.");
}

// Escáner y Alimentos
function toggleScanner() {
    const v = document.getElementById('scanner-visual');
    if (!scannerActivo) {
        v.style.display = 'block';
        Quagga.init({
            inputStream: { name: "Live", type: "LiveStream", target: v, constraints: { facingMode: "environment" } },
            decoder: { readers: ["ean_reader"] }
        }, (err) => { if(err) return; Quagga.start(); scannerActivo = true; });
        Quagga.onDetected((d) => { buscarGlobal(d.codeResult.code); Quagga.stop(); v.style.display='none'; scannerActivo=false; });
    } else { Quagga.stop(); v.style.display='none'; scannerActivo=false; }
}

async function buscarGlobal(c) {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${c}.json`);
    const data = await res.json();
    if(data.status===1) {
        const ch = data.product.nutriments.carbohydrates_100g || 0;
        const g = prompt(`${data.product.product_name}\nCarbos: ${ch}g/100g\n¿Cuántos gramos?`, "100");
        if(g) {
            const total = Math.round((ch * g) / 100);
            document.getElementById('inputCarbos').value = (parseFloat(document.getElementById('inputCarbos').value)||0) + total;
            const li = document.createElement('li'); li.innerHTML = `✅ ${data.product.product_name}: <strong>${total}g</strong>`;
            document.getElementById('lista-porciones').appendChild(li);
            document.getElementById('comida-actual').classList.remove('d-none');
        }
    }
}

function buscarAlimento() {
    const t = document.getElementById('buscadorAlimento').value.toLowerCase();
    const s = document.getElementById('sugerenciasAlimentos');
    s.innerHTML = "";
    if (t.length < 2) return;
    const base = [{n:"Pan",c:15},{n:"Arroz",c:45},{n:"Manzana",c:15}];
    base.filter(a => a.n.toLowerCase().includes(t)).forEach(a => {
        const b = document.createElement('button');
        b.className="list-group-item list-group-item-action";
        b.innerHTML=`${a.n} <span class="badge bg-secondary float-end">${a.c}g</span>`;
        b.onclick=()=>{
            document.getElementById('inputCarbos').value = (parseFloat(document.getElementById('inputCarbos').value)||0) + a.c;
            const li = document.createElement('li'); li.innerHTML = `✅ ${a.n}: <strong>${a.c}g</strong>`;
            document.getElementById('lista-porciones').appendChild(li);
            document.getElementById('comida-actual').classList.remove('d-none');
            s.innerHTML="";
            document.getElementById('buscadorAlimento').value="";
        };
        s.appendChild(b);
    });
}

function limpiarSeleccion() { document.getElementById('inputCarbos').value=""; document.getElementById('lista-porciones').innerHTML=""; document.getElementById('comida-actual').classList.add('d-none'); }
function borrarHistorial() { if(confirm("¿Borrar?")) { historial=[]; localStorage.removeItem('dt1_historial'); renderHistorial(); } }

mostrarSeccion('calculadora');
