const URL_API = "https://words-api-sy2x.onrender.com/api/word";
const CLAVE_HISTORIAL = "wordleHistorial";
 
// Filas del teclado virtual
const TECLAS = [
  [..."QWERTYUIOP"],
  [..."ASDFGHJKLÑ"],
  ["Enter", ..."ZXCVBNM", "DEL"],
];
 
// jjuego
let palabra = "";      // palabra a adivinar
let longitud = 0;      // num de letras
let maxIntentos = 0;   // num de intentos
let intentos = [];     // palabras ya enviadas
let actual = "";       // palabra que se esta escribiendo
let terminado = true;
 
const $ = (id) => document.getElementById(id);
 
// Quita tildes pero respeta la Ñ
const quitarTildes = (texto) =>
  texto.normalize("NFD").replace(/([^nN])[\u0300-\u036f]/g, "$1").normalize("NFC");
 
const mostrarMensaje = (texto) => {
  $("mensaje").textContent = texto;
};
 
// Inicio 
async function empezar(evento) {
  evento.preventDefault();
  longitud = Number($("letras").value);
  maxIntentos = Number($("intentos").value);
 
  $("boton-jugar").disabled = true;
  mostrarMensaje("Cargando palabra...");
 
  try {
    const respuesta = await fetch(`${URL_API}?lang=es&length=${longitud}&number=1`);
    const datos = await respuesta.json();
    // La API puede devolver una lista o un objetoy  cogemos la primera palabra
    const primera = Array.isArray(datos) ? datos[0] : (datos.words ? datos.words[0] : datos.word);
    palabra = quitarTildes(String(primera)).toUpperCase();
  } catch (error) {
    mostrarMensaje("No se pudo obtener la palabra. Inténtalo de nuevo.");
    $("boton-jugar").disabled = false;
    return;
  }
 
  mostrarMensaje("");
  prepararJuego();
}
 
function prepararJuego() {
  intentos = [];
  actual = "";
  terminado = false;
 
  // Tablero
  const tablero = $("tablero");
  tablero.innerHTML = "";
  tablero.style.gridTemplateColumns = `repeat(${longitud}, 1fr)`;
  tablero.style.width = `${longitud * 62}px`;
  for (let i = 0; i < longitud * maxIntentos; i++) {
    const celda = document.createElement("div");
    celda.className = "celda";
    tablero.appendChild(celda);
  }
 
  crearTeclado();
 
  $("formulario").classList.add("oculto");
  $("juego").classList.remove("oculto");
}
 
function crearTeclado() {
  const teclado = $("teclado");
  teclado.innerHTML = "";
  TECLAS.forEach((fila) => {
    const divFila = document.createElement("div");
    divFila.className = "fila-teclado";
    fila.forEach((tecla) => {
      const boton = document.createElement("button");
      boton.className = "tecla";
      boton.textContent = tecla;
      boton.dataset.tecla = tecla;
      boton.addEventListener("click", () => pulsar(tecla));
      divFila.appendChild(boton);
    });
    teclado.appendChild(divFila);
  });
}
 
// Entrada de teclas (virtual / real)
function pulsar(tecla) {
  if (terminado) return;
 
  if (tecla === "Enter") {
    enviar();
  } else if (tecla === "DEL") {
    actual = actual.slice(0, -1);
    pintarActual();
  } else if (actual.length < longitud) {
    actual += quitarTildes(tecla).toUpperCase();
    pintarActual();
  }
}
 
document.addEventListener("keydown", (evento) => {
  if (terminado) return;
 
  if (evento.key === "Enter") {
    evento.preventDefault(); // evita que el boton enfocado haga klik otra vez
    pulsar("Enter");
  } else if (evento.key === "Backspace" || evento.key === "Delete") {
    pulsar("DEL");
  } else if (/^[a-zñ]$/i.test(evento.key)) {
    pulsar(evento.key.toUpperCase());
  }
});
 
// Tablero
const obtenerCelda = (fila, columna) =>
  $("tablero").children[fila * longitud + columna];
 
function pintarActual() {
  const fila = intentos.length;
  for (let i = 0; i < longitud; i++) {
    obtenerCelda(fila, i).textContent = actual[i] || "";
  }
}
 
// Devuelve un array con "ok", "existe" o "no" para cada letra
function evaluar(intento) {
  const resultado = Array(longitud).fill("no");
  const restantes = {}; // letras de la palabra que aun no se han emparejado
 
  [...palabra].forEach((letra, i) => {
    if (intento[i] === letra) {
      resultado[i] = "ok";
    } else {
      restantes[letra] = (restantes[letra] || 0) + 1;
    }
  });
 
  [...intento].forEach((letra, i) => {
    if (resultado[i] !== "ok" && restantes[letra] > 0) {
      resultado[i] = "existe";
      restantes[letra]--;
    }
  });
 
  return resultado;
}
 
function colorearTecla(letra, clase) {
  const tecla = document.querySelector(`[data-tecla="${letra}"]`);
  if (!tecla || tecla.classList.contains("ok")) return;
  if (tecla.classList.contains("existe") && clase === "no") return;
  tecla.classList.remove("no", "existe");
  tecla.classList.add(clase);
}
 
function enviar() {
  if (actual.length < longitud) {
    mostrarMensaje("Faltan letras");
    return;
  }
  mostrarMensaje("");
 
  const fila = intentos.length;
  const resultado = evaluar(actual);
 
  resultado.forEach((clase, i) => {
    obtenerCelda(fila, i).classList.add(clase);
    colorearTecla(actual[i], clase);
  });
 
  intentos.push(actual);
  const gano = actual === palabra;
  actual = "";
 
  if (gano || intentos.length === maxIntentos) {
    terminar(gano);
  }
}
 
// Final y localstorage
function guardarPartida(gano) {
  const historial = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL)) || [];
  historial.push({
    palabra: palabra,
    intentos: intentos,
    fecha: new Date().toLocaleString(),
    resultado: gano ? "ganada" : "perdida",
  });
  // Solo guardamos las ultimas 10
  localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial.slice(-10)));
}
 
function mostrarHistorial() {
  const historial = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL)) || [];
  const lista = $("historial");
  lista.innerHTML = "";
 
  [...historial].reverse().forEach((partida) => {
    const item = document.createElement("li");
    item.innerHTML =
      `${partida.fecha} - <strong>${partida.palabra}</strong> ` +
      `(${partida.intentos.length} intentos: ${partida.intentos.join(", ")}) ` +
      `<span class="${partida.resultado}">${partida.resultado}</span>`;
    lista.appendChild(item);
  });
}
 
function terminar(gano) {
  terminado = true;
  guardarPartida(gano);
  mostrarHistorial();
 
  // teclado y tablero
  $("tablero").innerHTML = "";
  $("teclado").innerHTML = "";
  $("juego").classList.add("oculto");
  $("final").classList.remove("oculto");
 
  mostrarMensaje(gano ? "¡Has ganado!" : `Has perdido. La palabra era ${palabra}`);
}
 
function reiniciar() {
  $("final").classList.add("oculto");
  $("formulario").classList.remove("oculto");
  $("boton-jugar").disabled = false;
  mostrarMensaje("");
}
 
// Empezar y reiniciar
$("formulario").addEventListener("submit", empezar);
$("boton-reiniciar").addEventListener