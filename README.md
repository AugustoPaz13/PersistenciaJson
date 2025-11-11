# Aplicación de Tareas (To-Do) con Persistencia JSON

Este es un proyecto de consola en JavaScript para gestionar una lista de tareas. El objetivo principal de esta etapa fue implementar **mi primera persistencia de datos usando JSON**, agregando la capacidad de **guardar y leer** las tareas desde un archivo.

De esta forma, si cierro el programa y lo vuelvo a abrir, ¡las tareas siguen ahí!

---

## 🚀 ¿Qué hace el programa?

* **Ver Tareas:** Lista todas las tareas o las filtra (pendientes, en curso, etc.).
* **Agregar Tareas:** Permite crear una tarea nueva (título, descripción, etc.).
* **Editar Tareas:** Permite cambiar los datos de una tarea que ya existe.
* **Buscar Tareas:** Busca tareas por título.
* **Guardado en Archivo:** (¡Lo nuevo!) Guarda todos los cambios en un archivo llamado `tasks.json`.
* **Carga desde Archivo:** (¡Lo nuevo!) Al iniciar, lee `tasks.json` para cargar las tareas.

---

## 🛠️ ¿Cómo funciona el guardado y la carga?

Esta fue la parte central del ejercicio. Tuve que decirle a Node.js que "hable" con los archivos de mi computadora.

### 1. Módulos que usé

Usé dos módulos que vienen **nativos** con Node.js (no hizo falta instalar nada extra):

* `const fs = require('fs').promises;`
    * `fs` significa **File System** (Sistema de Archivos). Es el módulo que me dio las herramientas para leer y escribir archivos.
    * Usé `.promises` porque toda mi aplicación funciona de forma **asíncrona** (con `async/await`), y esta versión de `fs` funciona perfecto con eso.

* `const path = require('path');`
    * `path` me ayudó a crear la ruta al archivo de forma segura, para que funcione en cualquier sistema operativo (Windows, Mac, Linux).
    * Lo usé para definir dónde está mi archivo: `path.join(__dirname, 'tasks.json')`.

### 2. Al Iniciar: Cargar los Datos (Función `load`)

Cuando ejecuto `npm start`, la aplicación tiene que leer `tasks.json`. El desafío principal es que el archivo JSON y mi programa guardan los datos de forma distinta, así que tuve que **"traducirlos"**.

1.  **Leer el archivo:** Intento leer `tasks.json`. Si no existe (error `ENOENT`), cargo los datos de ejemplo (`seedDemo`).
2.  **Convertir el texto:** Uso `JSON.parse(data)` para convertir el *texto* del archivo en un *array de objetos* de JavaScript.
3.  **"Traducir" los Datos (Lo más importante):**
    * **El Problema:**
        * El JSON guarda el estado como un *texto*: `"PENDING"`.
        * Mi programa usa un *objeto*: `Estado.PENDIENTE`.
        * El JSON guarda la dificultad como un *número*: `1`.
        * Mi programa usa un *objeto*: `Dificultad.FACIL`.
    * **La Solución:**
        * Creé funciones "helper" (`mapEstadoDesdeJSON` y `mapDificultadDesdeJSON`).
        * Estas funciones usan un `switch` para "traducir" los valores. Por ejemplo, leen el texto `"PENDING"` del archivo y devuelven el objeto `Estado.PENDIENTE` que mi programa entiende.
        * Hice lo mismo con las fechas: el JSON las guarda como *texto*, y yo las convierto a un *objeto `Date`* de JavaScript (`new Date(texto)`) dentro del constructor de `Tarea`.
4.  **Crear las Tareas:** Recorro el array del JSON y, por cada item, uso `new Tarea()` pasándole los datos ya "traducidos".
5.  **Resumen:** Muestro en consola cuántas tareas se cargaron.

### 3. Al Modificar: Guardar los Datos (Función `save`)

Este es el proceso inverso al de carga, y tuve que hacer la "traducción" al revés.

1.  **No puedo guardar `this.tareas` directamente**, porque contiene objetos como `Estado.PENDIENTE` y el JSON no entendería eso.
2.  **Crear un array "traducido":**
    * Creé un array temporal (`tareasParaGuardar`).
    * Recorrí mi lista `this.tareas` y, por cada tarea, "traduje" los datos *de vuelta* al formato simple del JSON:
        * Mi objeto `Estado.PENDIENTE` se convirtió en el *texto* `"PENDING"`.
        * Mi objeto `Dificultad.FACIL` se convirtió en el *número* `1`.
        * Mis objetos `Date` de JavaScript se convirtieron en *texto* (usando `.toISOString()`).
3.  **Escribir en el archivo:**
    * Convertí este **nuevo array temporal** (`tareasParaGuardar`) a un string JSON.
    * Usé `JSON.stringify(..., null, 2)` para que el archivo `tasks.json` quede formateado y legible.
    * Finalmente, usé `fs.writeFile` para guardar ese string en el archivo.

Esto lo hago cada vez que agrego o edito una tarea, y también al salir del programa, para que los cambios nunca se pierdan.

---

## 🏃 Cómo ejecutar el proyecto

1.  **Inicializar el proyecto:**
    * Usé `npm init -y` para crear el archivo `package.json`. Este archivo guarda la información de mi proyecto.

2.  **Crear el Script de inicio:**
    * Edité el `package.json` para agregar un "script" de inicio.

    ```json
    "scripts": {
      "start": "node index.js"
    }
    ```

3.  **Ejecutar:**
    * Ahora, para iniciar la aplicación, solo tengo que escribir en la terminal:
    ```bash
    npm start
    ```
