// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBwkJkqrRCf4GIZ_GWb9ojII0neKoiJaDs",
  authDomain: "mi-control-dt1-a069c.firebaseapp.com",
  projectId: "mi-control-dt1-a069c",
  storageBucket: "mi-control-dt1-a069c.firebasestorage.app",
  messagingSenderId: "497315008054",
  appId: "1:497315008054:web:aaa34c68410af9d93e5297"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let user = null;
let config = {
    comidas: [
        { nombre: "Desayuno", inicio: 6, fin: 11, ratio: 10, escalas: [{min:0, max:150, dosis:0}] },
        { nombre: "Almuerzo", inicio: 12, fin: 17, ratio: 15, escalas: [{min:0, max:150, dosis:0}] },
        { nombre: "Cena", inicio: 19, fin: 23, ratio: 12, escalas: [{min:0, max:140, dosis:0}] }
    ]
};

// --- AUTENTICACIÓN ---
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert("Error al iniciar sesión: " + e.message));
}

function logout() { auth.signOut().then(() => location.reload()); }

auth.onAuthStateChanged(async (u) => {
    if (u) {
        user = u;
        document.getElementById('pantalla-login').classList.add('d-none');
        document.getElementById('app-principal').classList.remove('d-none');
        
        // Cargar configuración personalizada del usuario desde Firestore
        try {
            const doc = await db.collection("configs").doc(user.uid).get();
            if (doc.exists) {
                config = doc.data();
            }
            mostrarSeccion('calculadora');
        } catch(e) {
            console.error("Error cargando config:", e);
        }
    }
});

// --- LÓGICA DE NEGOCIO ---
let totalCarbos = 0;
let tempAlimento = null;
let scannerActivo = false;

function mostrarSeccion(s) {
    document.querySelectorAll('[id^="seccion-"]').forEach(el => el.classList.add('d-none'));
    document.getElementById('seccion-' + s).classList.remove('d-none');
    if(s==='calculadora') document.getElementById('txt-horario').innerText = getComida().nombre;
    if(s==='ajustes') renderAjustes();
    if(s==='historial') renderHistorial();
}

function getComida() {
    const h = new Date().getHours();
    return config.comidas.find(c => h >= c.inicio && h <= c.fin) || config.comidas[0];
}

function calcular() {
    const glice = parseFloat(document.getElementById('inputGlicemia').value);
    if(isNaN(glice)) return alert("Por favor, ingresa tu glicemia actual.");
    
    const comidaActual = getComida();
    const rango = comidaActual.escalas.find(r => glice >= r.min && glice <= r.max);
    const corr = rango ? rango.dosis : 0;
    const bolus = totalCarbos / comidaActual.ratio;
    const total = Math.round((corr + bolus) * 2) / 2;

    window.calculo = { 
        fecha: new Date(), 
        dosis: total, 
        glicemia: glice, 
        carbos: totalCarbos, 
        desc: `Corrección: +${corr}U | Comida: +${bolus.toFixed(1)}U` 
    };
    
    document.getElementById('dosis-total').innerText = total + " U";
    document.getElementById('detalle-txt').innerHTML = window.calculo.desc;
    document.getElementById('resultado').classList.remove('d-none');
}

async function confirmar() {
    try {
        await db.collection("historial").add({ 
            uid: user.uid, 
            ...window.calculo,
            fechaServer: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("¡Registro guardado en la nube!");
        limpiarSeleccion();
        document.getElementById('resultado').classList.add('d-none');
    } catch(e) {
        alert("Error al guardar: " + e.message);
    }
}

async function guardarConfig() {
    try {
        await db.collection("configs").doc(user.uid).set(config);
        alert("Configuración sincronizada con Google");
        mostrarSeccion('calculadora');
    } catch(e) {
        alert("Error al guardar ajustes: " + e.message);
    }
}

// --- GESTIÓN DE ALIMENTOS ---
const baseAlimentos = [
    {n:"Pan de Molde",c:15,p:"1 rebanada"}, 
    {n:"Arroz Blanco",c:45,p:"1 taza cocida"}, 
    {n:"Manzana",c:15,p:"1 unidad"},
    {n:"Leche Entera",c:12,p:"1 taza (240ml)"},
    {n:"Plátano",c:25,p:"1 unidad"}
];

function buscarAlimento() {
    const t = document.getElementById('buscador').value.toLowerCase();
    const sug = document.getElementById('sugerencias');
    sug.innerHTML = "";
    if(t.length < 2) return;
    baseAlimentos.filter(a => a.n.toLowerCase().includes(t)).forEach(a => {
        const btn = document.createElement('button');
        btn.className = "list-group-item list-group-item-action";
        btn.innerHTML = `<strong>${a.n}</strong> <small class="text-muted">(${a.p})</small>`;
        btn.onclick = () => {
            tempAlimento = a;
            document.getElementById('p-titulo').innerText = a.n;
            document.getElementById('p-info').innerText = `Base: ${a.p} = ${a.c}g carbos`;
            document.getElementById('modal-p').classList.remove('d-none');
            sug.innerHTML = "";
        };
        sug.appendChild(btn);
    });
}

function addAlimento() {
    const cant = parseFloat(document.getElementById('p-cant').value);
    if(isNaN(cant) || cant <= 0) return;
    const c = Math.round(tempAlimento.c * cant);
    totalCarbos += c;
    document.getElementById('inputCarbos').value = totalCarbos;
    const li = document.createElement('li');
    li.className = "border-bottom py-1";
    li.innerHTML = `• ${cant}x ${tempAlimento.n} (<strong>${c}g</strong>)`;
    document.getElementById('lista-items').appendChild(li);
    document.getElementById('resumen-comida').classList.remove('d-none');
    cerrarModal();
}

function cerrarModal() { 
    document.getElementById('modal-p').classList.add('d-none'); 
    document.getElementById('buscador').value=""; 
}

function limpiarSeleccion() { 
    totalCarbos=0; 
    document.getElementById('inputCarbos').value=0; 
    document.getElementById('lista-items').innerHTML=""; 
    document.getElementById('resumen-comida').classList.add('d-none'); 
    document.getElementById('inputGlicemia').value="";
}

// --- RENDERIZADO DE AJUSTES ---
function renderAjustes() {
    const cont = document.getElementById('ajustes-container');
    cont.innerHTML = config.comidas.map((c, ci) => `
        <div class="card p-3 mb-3 border-top border-primary border-4 shadow-sm">
            <div class="d-flex justify-content-between mb-2">
                <strong class="text-primary">${c.nombre}</strong> 
                <button class="btn btn-sm btn-primary" onclick="addRango(${ci})">+ Rango</button>
            </div>
            <div class="mb-3">
                <label class="small fw-bold">Ratio (1U por cada X gramos):</label>
                <input type="number" class="form-control form-control-sm" value="${c.ratio}" onchange="config.comidas[${ci}].ratio=parseFloat(this.value)">
            </div>
            <div class="row g-1 text-center small fw-bold text-muted mb-1">
                <div class="col-4">Min</div><div class="col-4">Max</div><div class="col-4">Insul.</div>
            </div>
            ${c.escalas.map((e, ei) => `
                <div class="d-flex gap-1 mb-1">
                    <input type="number" class="form-control form-control-sm text-center" value="${e.min}" onchange="config.comidas[${ci}].escalas[${ei}].min=parseFloat(this.value)">
                    <input type="number" class="form-control form-control-sm text-center" value="${e.max}" onchange="config.comidas[${ci}].escalas[${ei}].max=parseFloat(this.value)">
                    <input type="number" class="form-control form-control-sm text-center border-primary fw-bold" value="${e.dosis}" onchange="config.comidas[${ci}].escalas[${ei}].dosis=parseFloat(this.value)">
                    <button class="btn btn-sm text-danger" onclick="config.comidas[${ci}].escalas.splice(${ei},1);renderAjustes()">✕</button>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function addRango(ci) { 
    config.comidas[ci].escalas.push({min:0, max:0, dosis:0}); 
    renderAjustes(); 
}

async function renderHistorial() {
    const snap = await db.collection("historial")
                        .where("uid", "==", user.uid)
                        .orderBy("fecha", "desc")
                        .limit(30)
                        .get();
    
    document.getElementById('lista-historial').innerHTML = snap.docs.length ? snap.docs.map(d => {
        const i = d.data();
        const fecha = i.fecha.toDate ? i.fecha.toDate().toLocaleString() : new Date(i.fecha).toLocaleString();
        return `<div class="card p-2 mb-2 small shadow-sm border-start border-primary border-4">
            <div class="d-flex justify-content-between">
                <strong>${fecha}</strong>
                <span class="badge bg-primary fs-6">${i.dosis} U</span>
            </div>
            <div class="text-muted mt-1">Glice: ${i.glicemia} | Carbos: ${i.carbos}g</div>
        </div>`;
    }).join('') : "<p class='text-center text-muted mt-3'>Aún no hay registros.</p>";
}

// --- ESCÁNER ---
function toggleScanner() {
    const v = document.getElementById('scanner-visual');
    if (!scannerActivo) {
        v.style.display = 'block';
        Quagga.init({ 
            inputStream: { name: "Live", type: "LiveStream", target: v, constraints: { facingMode: "environment" } }, 
            decoder: { readers: ["ean_reader"] } 
        }, (err) => { 
            if(err) return alert("Error cámara: " + err);
            Quagga.start(); 
            scannerActivo = true; 
        });
        Quagga.onDetected((d) => { 
             fetch(`https://world.openfoodfacts.org/api/v0/product/${d.codeResult.code}.json`).then(r=>r.json()).then(data=>{
                 if(data.status===1) {
                     tempAlimento = { 
                        n: data.product.product_name || "Producto desconocido", 
                        c: data.product.nutriments.carbohydrates_100g || 0, 
                        p: "100g" 
                     };
                     document.getElementById('p-titulo').innerText = tempAlimento.n;
                     document.getElementById('p-info').innerText = "Info nutricional: 100g = " + tempAlimento.c + "g carbos";
                     document.getElementById('modal-p').classList.remove('d-none');
                 } else {
                     alert("Producto no encontrado en la base de datos.");
                 }
             });
             Quagga.stop(); 
             v.style.display='none'; 
             scannerActivo=false; 
        });
    } else { 
        Quagga.stop(); 
        v.style.display='none'; 
        scannerActivo=false; 
    }
}
