const readline = require("readline");
// Importa los módulos 'fs' (para leer/escribir archivos) y 'path' (para rutas)
const fs = require('fs').promises; // Usa la versión de promesas
const path = require('path');

// Define la ruta al archivo JSON.
const TASK_FILE_PATH = path.join(__dirname, 'tasks.json');


// --- ConsoleIO (Prototipo) ---
// Esta es la clase para manejar la entrada y salida de la consola
function ConsoleIO() {
  this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
}

// Función asíncrona para hacer preguntas
ConsoleIO.prototype.ask = function(question) {
  return new Promise((resolve) => {
    this.rl.question(question, (answer) => resolve(answer));
  });
};

// Función para cerrar la consola
ConsoleIO.prototype.close = function() {
  this.rl.close();
};

// --- Enums y Helpers ---
// Define los "enums" (objetos congelados) para los estados.
const Estado = Object.freeze({
  PENDIENTE: { code: "P", label: "Pendiente" },
  EN_CURSO: { code: "E", label: "En curso" },
  TERMINADA: { code: "T", label: "Terminada" },
  CANCELADA: { code: "C", label: "Cancelada" },
});

// Esta función "traduce" la entrada del usuario (ej: "P") al objeto Estado.PENDIENTE
const EstadoDesdeEntrada = (value) => {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  if (v === "P" || v === "PENDIENTE") return Estado.PENDIENTE;
  if (v === "E" || v === "EN CURSO" || v === "EN_CURSO") return Estado.EN_CURSO;
  if (v === "T" || v === "TERMINADA") return Estado.TERMINADA;
  if (v === "C" || v === "CANCELADA") return Estado.CANCELADA;
  return null;
};

const Dificultad = Object.freeze({
  FACIL: { code: 1, label: "Fácil", stars: "★☆☆" },
  MEDIO: { code: 2, label: "Medio", stars: "★★☆" },
  DIFICIL: { code: 3, label: "Difícil", stars: "★★★" },
});

// "Traduce" la entrada del usuario (ej: "1" o "F") al objeto Dificultad.FACIL
const DificultadDesdeEntrada = (value) => {
  if (!value) return null;
  const v = value.toString().trim().toUpperCase();
  if (v === "1" || v === "F" || v === "FACIL" || v === "FÁCIL") return Dificultad.FACIL;
  if (v === "2" || v === "M" || v === "MEDIO") return Dificultad.MEDIO;
  if (v === "3" || v === "D" || v === "DIFICIL" || v === "DIFÍCIL") return Dificultad.DIFICIL;
  return null;
};

// --- Tarea (Prototipo) ---
/**
 * Este es el "molde" (constructor) para las Tareas.
 * Acepta parámetros para poder crear tareas nuevas o cargarlas desde el JSON.
 * @param {object} params - Parámetros de la tarea
 * @param {string} params.titulo (obligatorio, 1..100)
 * @param {string|null} params.descripcion (0..500)
 * @param {object} params.estado (enum Estado)
 * @param {Date|null} params.vencimiento
 * @param {object} params.dificultad (enum Dificultad)
 * @param {Date|string|null} params.creacion // Acepta string para cargar desde JSON
 * @param {Date|string|null} params.ultimaEdicion // Acepta string para cargar desde JSON
 */
function Tarea({ titulo, descripcion = null, estado = Estado.PENDIENTE, vencimiento = null, dificultad = Dificultad.FACIL, creacion = null, ultimaEdicion = null }) {
  // Validaciones básicas
  if (!titulo || typeof titulo !== "string" || titulo.trim().length === 0 || titulo.trim().length > 100) {
    throw new Error("Título inválido: obligatorio, 1..100 caracteres.");
  }
  if (descripcion !== null && descripcion !== undefined) {
    if (typeof descripcion !== "string" || descripcion.length > 500) {
      throw new Error("Descripción inválida: hasta 500 caracteres.");
    }
  }
  this.titulo = titulo.trim();
  this.descripcion = descripcion && descripcion.trim().length > 0 ? descripcion.trim() : null;
  this.estado = estado || Estado.PENDIENTE;
  this.dificultad = dificultad || Dificultad.FACIL;

  // Lógica de fechas para manejar carga desde JSON o creación nueva
  // Si 'creacion' viene (como string del JSON), lo convierte a Date. Si no, crea una fecha nueva.
  this.creacion = creacion ? new Date(creacion) : new Date();
  // 'ultimaEdicion' puede ser null (según el JSON), o un string, o la creo ahora.
  this.ultimaEdicion = ultimaEdicion ? new Date(ultimaEdicion) : new Date(this.creacion);

  // Lógica para vencimiento
  if (vencimiento) {
    const d = new Date(vencimiento);
    this.vencimiento = (d instanceof Date && !isNaN(d.getTime())) ? d : null;
  } else {
    this.vencimiento = null;
  }
  
  // Valido que las fechas parseadas sean correctas
  if (isNaN(this.creacion.getTime())) throw new Error(`Fecha de creación inválida para Tarea: ${titulo}`);
  if (this.ultimaEdicion && isNaN(this.ultimaEdicion.getTime())) throw new Error(`Fecha de última edición inválida para Tarea: ${titulo}`);
}

// Función para actualizar una tarea existente
Tarea.prototype.actualizar = function({ descripcion, estado, dificultad, vencimiento }) {
  // Reglas de blank/space:
  // - Si input === "" (vacío) => mantener el valor actual
  // - Si input === " " (un espacio) => setear en null (borrar)

  if (descripcion !== undefined) {
    if (descripcion === "") {
    } else if (descripcion === " ") {
      this.descripcion = null;
    } else {
      if (descripcion.length > 500) throw new Error("Descripción inválida: hasta 500 caracteres.");
      this.descripcion = descripcion.trim();
    }
  }

  if (estado !== undefined) {
    if (estado === "") {
    } else {
      const e = EstadoDesdeEntrada(estado);
      if (!e) throw new Error("Estado inválido. Use P/E/T/C o su nombre.");
      this.estado = e;
    }
  }

  if (dificultad !== undefined) {
    if (dificultad === "") {
    } else {
      const d = DificultadDesdeEntrada(dificultad);
      if (!d) throw new Error("Dificultad inválida. Use 1/2/3 o F/M/D.");
      this.dificultad = d;
    }
  }

  if (vencimiento !== undefined) {
    if (vencimiento === "") {
    } else if (vencimiento === " ") {
      this.vencimiento = null;
    } else {
      const fecha = parseFecha(vencimiento);
      if (!fecha) throw new Error("Fecha de vencimiento inválida.");
      this.vencimiento = fecha;
    }
  }

  // Actualiza la fecha de edición cada vez que llama a esta función
  this.ultimaEdicion = new Date();
};

// --- TareaRepositorio (Prototipo) ---
// Esta es la "base de datos" en memoria. Maneja la lista de tareas.
function TareaRepositorio() {
  /** @type {Tarea[]} */
  this.tareas = [];
  // Guardo la ruta del archivo
  this.filePath = TASK_FILE_PATH;
}

TareaRepositorio.prototype.add = function(tarea) {
  this.tareas.push(tarea);
};

TareaRepositorio.prototype.getAll = function() {
  return [...this.tareas];
};

TareaRepositorio.prototype.getByIndex = function(index) {
  if (index < 0 || index >= this.tareas.length) return null;
  return this.tareas[index];
};

TareaRepositorio.prototype.filterByEstado = function(estado) {
  return this.tareas.filter((t) => t.estado === estado);
};

TareaRepositorio.prototype.searchByTitle = function(substr) {
  const q = substr.trim().toLowerCase();
  return this.tareas.filter((t) => t.titulo.toLowerCase().includes(q));
};

// Método para cargar tareas desde tasks.json
TareaRepositorio.prototype.load = async function() {
  console.log("Cargando tareas desde el archivo JSON...");
  try {
    // 1. Intenta leer el archivo
    const data = await fs.readFile(this.filePath, 'utf8');
    // 2. Convierte el texto JSON a un array de JavaScript
    const tareasJson = JSON.parse(data);
    
    if (!Array.isArray(tareasJson)) {
      throw new Error("El archivo JSON no contiene un array de tareas.");
    }

    let cargadas = 0;
    let errores = 0;

    // "Traductor" del ESTADO del JSON (String "PENDING") a mi Enum (Estado.PENDIENTE)
    const mapEstadoDesdeJSON = (jsonEstado) => {
      if (!jsonEstado) return Estado.PENDIENTE; // Default
      switch (jsonEstado.toUpperCase()) {
        case "PENDING": return Estado.PENDIENTE;
        case "IN-PROGRESS": return Estado.EN_CURSO;
        case "FINISHED": return Estado.TERMINADA;
        case "CANCELED": return Estado.CANCELADA;
        default: return Estado.PENDIENTE;
      }
    };

    // "Traductor" de la DIFICULTAD del JSON (Num 1) a mi Enum (Dificultad.FACIL)
    const mapDificultadDesdeJSON = (jsonDificultad) => {
      if (!jsonDificultad) return Dificultad.FACIL; // Default
      switch (Number(jsonDificultad)) {
        case 1: return Dificultad.FACIL;
        case 2: return Dificultad.MEDIO;
        case 3: return Dificultad.DIFICIL;
        default: return Dificultad.FACIL;
      }
    };

    // 3. Recorre el array del JSON y crea mis Tareas
    for (const item of tareasJson) {
      try {
        // Uso los "traductores" para preparar los datos
        const tareaData = {
          ...item, // titulo, descripcion, vencimiento, creacion, ultimaEdicion
          estado: mapEstadoDesdeJSON(item.estado),
          dificultad: mapDificultadDesdeJSON(item.dificultad),
        };
        
        // Usa el constructor de Tarea, que valida todo
        const tarea = new Tarea(tareaData);
        this.add(tarea); // La agrega a mi lista en memoria
        cargadas++;
      } catch (validationError) {
        // Si una tarea del JSON está mal, la salta pero no detiene la app
        console.warn(`\n[ADVERTENCIA] Tarea inválida en JSON (saltada): ${validationError.message}`);
        console.warn(`Datos: ${JSON.stringify(item.titulo || 'Tarea sin título')}`);
        errores++;
      }
    }
    
    // 4. Muestra el resumen
    console.log(`\n--- Resumen de Carga ---`);
    console.log(`Se cargaron ${cargadas} tareas exitosamente.`);
    if (errores > 0) {
      console.log(`Se omitieron ${errores} tareas por datos inválidos.`);
    }
    console.log(`------------------------\n`);

  } catch (error) {
    // Manejo de errores de archivo
    if (error.code === 'ENOENT') {
      // ENOENT = Error NO ENTity (No existe el archivo)
      console.log("No se encontró 'tasks.json'. Usando datos de demostración.");
      console.log("El archivo se creará automáticamente al guardar cambios o al salir.");
      await this.seedDemo(); // Uso los datos demo como fallback
    } else {
      // Error de JSON mal formateado u otro
      console.error("\n[ERROR CRÍTICO] No se pudo leer 'tasks.json'.");
      console.error("Verifique que el archivo no esté corrupto.");
      console.error(`Detalle: ${error.message}`);
      throw error; // Detiene la app si el JSON es ilegible
    }
  }
};

// Método para guardar tareas en tasks.json
TareaRepositorio.prototype.save = async function() {
  
  // "Traductor" de mi Enum (Estado.PENDIENTE) al ESTADO del JSON (String "PENDING")
  const mapEstadoToJSON = (enumEstado) => {
    if (!enumEstado) return "PENDING";
    switch (enumEstado) {
      case Estado.PENDIENTE: return "PENDING";
      case Estado.EN_CURSO: return "IN-PROGRESS";
      case Estado.TERMINADA: return "FINISHED";
      case Estado.CANCELADA: return "CANCELED";
      default: return "PENDING";
    }
  };
  
  // "Traductor" de mi Enum (Dificultad.FACIL) a la DIFICULTAD del JSON (Num 1)
  const mapDificultadToJSON = (enumDificultad) => {
    if (!enumDificultad) return 1;
    switch (enumDificultad) {
      case Dificultad.FACIL: return 1;
      case Dificultad.MEDIO: return 2;
      case Dificultad.DIFICIL: return 3;
      default: return 1;
    }
  };

  try {
    // Convierte mi array de Tareas (objetos) a un array simple para JSON
    const tareasParaGuardar = this.tareas.map(tarea => {
      return {
        titulo: tarea.titulo,
        descripcion: tarea.descripcion, // JSON.stringify maneja bien los 'null'
        estado: mapEstadoToJSON(tarea.estado), // <--- Traducido
        creacion: tarea.creacion.toISOString(), // Guardo fechas en formato estándar ISO
        ultimaEdicion: tarea.ultimaEdicion ? tarea.ultimaEdicion.toISOString() : null,
        vencimiento: tarea.vencimiento ? tarea.vencimiento.toISOString() : null,
        dificultad: mapDificultadToJSON(tarea.dificultad) // <--- Traducido
      };
    });
    
    // Convierte el array "traducido" a un string JSON (con formato legible)
    const data = JSON.stringify(tareasParaGuardar, null, 2);
    
    // Escribe el string en el archivo
    await fs.writeFile(this.filePath, data, 'utf8');
    console.log(`\n(Tareas guardadas en ${this.filePath})`);
  } catch (error) {
    console.error(`\n[ERROR] No se pudo guardar en ${this.filePath}:`, error.message);
  }
};

// Mis datos de demostración, por si no existe el JSON
TareaRepositorio.prototype.seedDemo = async function() {
  if (this.getAll().length > 0) return;
  const t1 = new Tarea({ titulo: "Comprar Huevos", descripcion: "Ir al súper y comprar una docena", estado: Estado.PENDIENTE, dificultad: Dificultad.FACIL });
  const t2 = new Tarea({ titulo: "Pasear al perro", descripcion: "Ejercitar 30 minutos", estado: Estado.EN_CURSO, dificultad: Dificultad.MEDIO, vencimiento: parseFecha("2025-12-01 18:00") });
  const t3 = new Tarea({ titulo: "Terminar práctico de BD", descripcion: null, estado: Estado.TERMINADA, dificultad: Dificultad.DIFICIL });
  
  this.add(t1);
  this.add(t2);
  this.add(t3);
  
  console.log("(Datos de demostración cargados)");
};


// --- Utilidades de fecha e impresión ---
// Función para parsear fechas que ingresa el usuario
function parseFecha(input) {
  if (!input) return null;
  const s = input.trim();
  
  // Intenta formato ISO (YYYY-MM-DD)
  const isoCandidate = s.match(/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?$/);
  if (isoCandidate) {
    const normalized = s.replace(" ", "T");
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;
  }
  // Intenta formato DD/MM/YYYY
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1; // Meses en JS van de 0 a 11
    const year = parseInt(dmy[3], 10);
    const hours = dmy[4] ? parseInt(dmy[4], 10) : 0;
    const minutes = dmy[5] ? parseInt(dmy[5], 10) : 0;
    const d = new Date(year, month, day, hours, minutes);
    if (!isNaN(d.getTime())) return d;
  }
  // Intenta formato genérico
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fallback;
  return null;
}

// Función para mostrar fechas de forma legible
function formatFecha(d) {
  if (!d) return "Sin datos";
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Función para mostrar la dificultad
function mostrarDificultad(d) {
  if (!d) return "Sin datos";
  return `${d.label} (${d.stars})`;
}

// --- ToDoApp (Prototipo) ---
// Esta es la clase principal que controla toda la aplicación y los menús
function ToDoApp(io, repo) {
  this.io = io;
  this.repo = repo;
  this.username = "Usuario";
}

// El loop principal de la aplicación
ToDoApp.prototype.run = async function() {
  // Intenta cargar las tareas desde el JSON
  try {
    await this.repo.load(); // Carga o usa seedDemo si no existe
    await this.pauseMsg("Presiona Enter para iniciar la aplicación...");
  } catch (e) {
    // Si load() falló (JSON corrupto), detiene la app.
    console.error("La aplicación no puede iniciar debido a un error crítico.");
    this.io.close();
    return;
  }
  
  let salir = false;
  while (!salir) {
    console.clear();
    console.log(`¡Hola ${this.username}!\n`);
    console.log("¿Qué desea hacer?\n");
    console.log("[1] Ver mis tareas");
    console.log("[2] Buscar una tarea");
    console.log("[3] Agregar una tarea");
    console.log("[0] Salir\n");
    const op = (await this.io.ask("> ")).trim();
    switch (op) {
      case "1":
        await this.menuVerMisTareas();
        break;
      case "2":
        await this.menuBuscarTarea();
        break;
      case "3":
        await this.menuAgregarTarea();
        break;
      case "0":
        salir = true;
        break;
      default:
        await this.pauseMsg("Opción inválida. Intente nuevamente.");
    }
  }
  
  // Guarda las tareas al salir
  await this.repo.save();
  this.io.close();
  console.log("¡Hasta luego!");
};

// Menú para ver tareas filtradas
ToDoApp.prototype.menuVerMisTareas = async function() {
  let volver = false;
  while (!volver) {
    console.clear();
    console.log("¿Qué tarea desea ver?\n");
    console.log("[1] Todas");
    console.log("[2] Pendientes");
    console.log("[3] En curso");
    console.log("[4] Terminadas");
    console.log("[0] Volver\n");
    const op = (await this.io.ask("> ")).trim();
    switch (op) {
      case "1":
        await this.listadoTareas(this.repo.getAll(), "Todas tus tareas");
        break;
      case "2":
        await this.listadoTareas(this.repo.filterByEstado(Estado.PENDIENTE), "Tareas Pendientes");
        break;
      case "3":
        await this.listadoTareas(this.repo.filterByEstado(Estado.EN_CURSO), "Tareas En curso");
        break;
      case "4":
        await this.listadoTareas(this.repo.filterByEstado(Estado.TERMINADA), "Tareas Terminadas");
        break;
      case "0":
        volver = true;
        break;
      default:
        await this.pauseMsg("Opción inválida. Intente nuevamente.");
    }
  }
};

// Sub-menú que muestra la lista de tareas y permite seleccionar una
ToDoApp.prototype.listadoTareas = async function(tareas, titulo) {
  // Ordena las tareas alfabéticamente para mostrarlas
  const ordenadas = [...tareas].sort((a, b) => a.titulo.localeCompare(b.titulo, undefined, { sensitivity: "base" }));
  let volver = false;
  while (!volver) {
    console.clear();
    console.log(`${titulo}.\n`);
    if (ordenadas.length === 0) {
      console.log("(No hay tareas para mostrar)\n");
      await this.pauseMsg("Presiona Enter para volver...");
      return;
    }
    // Muestra la lista numerada
    ordenadas.forEach((t, i) => {
      console.log(`[${i + 1}] ${t.titulo}`);
    });
    console.log("\n¿Deseas ver los detalles de alguna?");
    console.log("Introduce el número para verla o 0 para volver.");
    const op = (await this.io.ask("> ")).trim();
    if (op === "0") return;
    const idx = Number.parseInt(op, 10);
    if (Number.isNaN(idx) || idx < 1 || idx > ordenadas.length) {
      await this.pauseMsg("Opción inválida. Intente nuevamente.");
      continue;
    }
    const tarea = ordenadas[idx - 1];
    // Lleva al menú de detalles para la tarea seleccionada
    await this.menuDetallesTarea(tarea);
  }
};

// Menú que muestra todos los detalles de una tarea
ToDoApp.prototype.menuDetallesTarea = async function(tarea) {
  let volver = false;
  while (!volver) {
    console.clear();
    console.log("Esta es la tarea que elegiste.\n");
    console.log(`\t${tarea.titulo}`);
    console.log(`\t${tarea.descripcion ? tarea.descripcion : "(Sin descripción)"}`);
    console.log(`\tEstado: ${tarea.estado.label}`);
    console.log(`\tDificultad: ${mostrarDificultad(tarea.dificultad)}`);
    console.log(`\tVencimiento: ${tarea.vencimiento ? formatFecha(tarea.vencimiento) : "Sin datos"}`);
    console.log(`\tCreación: ${formatFecha(tarea.creacion)}`);
    console.log(`\tÚltima edición: ${tarea.ultimaEdicion ? formatFecha(tarea.ultimaEdicion) : "Sin datos"}\n`);
    console.log("Si deseas editarla selecciona E, si no 0 para volver");
    const op = (await this.io.ask("> ")).trim().toUpperCase();
    if (op === "0") return;
    if (op === "E") {
      await this.menuEdicionTarea(tarea);
    } else {
      await this.pauseMsg("Opción inválida. Intente nuevamente.");
    }
  }
};

// Menú para editar una tarea
ToDoApp.prototype.menuEdicionTarea = async function(tarea) {
  while (true) {
    console.clear();
    console.log(`Estas editando la tarea: ${tarea.titulo}`);
    console.log(" - Si deseas mantener los valores de un atributo simplemente dejalo en blanco");
    console.log(" - Si deseas dejar en blanco un atributo, escribe un espacio");
    console.log("");

    const nuevaDesc = await this.io.ask("1. Ingresa la descripción: ");
    const nuevoEstado = await this.io.ask("2. Estado([P]endiente/[E]n curso/[T]erminada/[C]ancelada): ");
    const nuevaDific = await this.io.ask("3. Dificultad([1]/[2]/[3]): ");
    const nuevoVenc = await this.io.ask("4. Vencimiento (YYYY-MM-DD o DD/MM/YYYY opcional HH:mm): ");

    try {
      // 1. Actualiza la tarea en memoria
      tarea.actualizar({ descripcion: nuevaDesc, estado: nuevoEstado, dificultad: nuevaDific, vencimiento: nuevoVenc });
      
      // 2. Guarda la lista actualizada en el archivo JSON
      await this.repo.save(); 
      
      console.log("\n¡Datos guardados y archivo actualizado!");
      await this.pauseMsg("Presiona Enter para continuar...");
      return;
    } catch (e) {
      console.log(`\nError: ${e.message}`);
      const retry = (await this.io.ask("¿Deseas reintentar? (S/N): ")).trim().toUpperCase();
      if (retry !== "S") return;
    }
  }
};

// Menú para buscar una tarea por título
ToDoApp.prototype.menuBuscarTarea = async function() {
  while (true) {
    console.clear();
    console.log("Introduce el título de una tarea para buscarla");
    const q = await this.io.ask("> ");
    const query = q.trim();
    if (query.length === 0) {
      const back = (await this.io.ask("Búsqueda vacía. ¿Volver? (S/N): ")).trim().toUpperCase();
      if (back === "S") return;
      continue;
    }
    const resultados = this.repo.searchByTitle(query);
    if (resultados.length === 0) {
      console.log("\nNo hay tareas relacionadas con la búsqueda.\n");
      await this.pauseMsg("Presiona Enter para continuar...");
      return;
    }
    // Reutiliza el menú de listado para mostrar los resultados
    await this.listadoTareas(resultados, "Estas son las tareas relacionadas");
    return;
  }
};

// Menú para agregar una tarea nueva
ToDoApp.prototype.menuAgregarTarea = async function() {
  while (true) {
    console.clear();
    console.log("Estas creando una nueva tarea.\n");
    const titulo = (await this.io.ask("1. Ingresa el título: ")).trim();
    const descripcion = await this.io.ask("2. Ingresa la descripción: ");
    const estadoIn = await this.io.ask("3. Estado ([P]endiente/[E]n curso/[T]erminada/[C]ancelada) [Enter para P]: ");
    const dificIn = await this.io.ask("4. Dificultad ([1]/[2]/[3]) [Enter para 1]: ");
    const vencIn = await this.io.ask("5. Vencimiento (YYYY-MM-DD o DD/MM/YYYY opcional HH:mm) [opcional]: ");

    try {
      // Valida el título
      if (!titulo || titulo.length === 0 || titulo.length > 100) {
        throw new Error("Título inválido: obligatorio, 1..100 caracteres.");
      }
      // Procesa las entradas con valores default
      let estado = estadoIn.trim() === "" ? Estado.PENDIENTE : EstadoDesdeEntrada(estadoIn);
      if (!estado) throw new Error("Estado inválido. Use P/E/T/C o su nombre.");
      
      let dificultad = dificIn.trim() === "" ? Dificultad.FACIL : DificultadDesdeEntrada(dificIn);
      if (!dificultad) throw new Error("Dificultad inválida. Use 1/2/3 o F/M/D.");
      
      let vencimiento = null;
      if (vencIn && vencIn.trim() !== "") {
        const f = parseFecha(vencIn);
        if (!f) throw new Error("Fecha de vencimiento inválida.");
        vencimiento = f;
      }
      
      // 1. Crea la tarea en memoria
      const tarea = new Tarea({ titulo, descripcion, estado, dificultad, vencimiento });
      // 2. La agrega al repositorio
      this.repo.add(tarea);
      
      // 3. Guarda la lista actualizada en el archivo JSON
      await this.repo.save();
      
      console.log("\n¡Datos guardados y archivo actualizado!");
      await this.pauseMsg("Presiona Enter para continuar...");
      return;
    } catch (e) {
      console.log(`\nError: ${e.message}`);
      const retry = (await this.io.ask("¿Deseas reintentar? (S/N): ")).trim().toUpperCase();
      if (retry !== "S") return;
    }
  }
};

// Función útil para pausar la ejecución
ToDoApp.prototype.pauseMsg = async function(msg) {
  await this.io.ask(`\n${msg}`);
};

// --- Main ---
(async function main() {
  const io = new ConsoleIO();
  const repo = new TareaRepositorio();
  const app = new ToDoApp(io, repo);
  await app.run();
})();