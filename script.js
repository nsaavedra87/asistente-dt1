// 1. CONFIGURACIÓN INICIAL
const config = {
    objetivo: 100,
    sensibilidad: 50,
    // Aquí definimos tus horarios:
    franjas: [
        { nombre: "Desayuno", inicio: 6, fin: 11, ratio: 10 },
        { nombre: "Almuerzo", inicio: 12, fin: 18, ratio: 12 },
        { nombre: "Cena", inicio: 19, fin: 23, ratio: 15 },
        { nombre: "Madrugada", inicio: 0, fin: 5, ratio: 15 }
    ]
};

// 2. FUNCIÓN PARA SABER QUÉ RATIO USAR AHORA
function obtenerRatioActual() {
    const horaActual = new Date().getHours();
    const franja = config.franjas.find(f => horaActual >= f.inicio && horaActual <= f.fin);
    return franja ? franja.ratio : 15; // Si no encuentra, usa 15 por defecto
}

// 3. FUNCIÓN DE CÁLCULO PRINCIPAL
function ejecutarCalculo() {
    const glicemia = parseFloat(document.getElementById('inputGlicemia').value);
    const carbos = parseFloat(document.getElementById('inputCarbos').value);
    
    if (!glicemia || !carbos) {
        alert("Por favor, completa ambos campos");
        return;
    }

    const ratio = obtenerRatioActual();
    
    // Cálculo: (Glicemia - Objetivo) / Sensibilidad + (Carbos / Ratio)
    const correccion = (glicemia - config.objetivo) / config.sensibilidad;
    const dosisComida = carbos / ratio;
    let total = correccion + dosisComida;

    // Redondeo para pluma (al 0.5 más cercano)
    const dosisFinal = Math.round(total * 2) / 2;

    // Mostrar resultado en pantalla
    document.getElementById('valorDosis').innerText = (dosisFinal < 0 ? 0 : dosisFinal) + " U";
    document.getElementById('detalleTexto').innerText = `Usando ratio de ${ratio} para esta hora.`;
    document.getElementById('resultadoContainer').classList.remove('d-none');
}
