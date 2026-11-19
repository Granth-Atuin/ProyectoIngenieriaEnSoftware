# RFC Técnico: RFC-CU04 - Solicitar Préstamo de Equipos Audiovisuales
## Sistema de Gestión para el Laboratorio de Medios Audiovisuales (UNTDF)

| Campo | Detalle |
| :--- | :--- |
| **Título** | RFC-CU04: Prototipo Técnico de Solicitud de Préstamos Audiovisuales |
| **Proyecto** | Sistema de Gestión de Préstamos — Laboratorio de Medios Audiovisuales |
| **Materia / Grupo** | Ingeniería de Software I (UNTDF) — Grupo N° 2 |
| **Integrantes** | Francisco Gonzalo Manuello, Adriano Ortigoza Calveri, Juan Pablo Ocampo, Elías Joaquín Martín Gómez |
| **Fecha** | Noviembre 2026 |
| **Estado** | Implementado |
| **Revisores** | Cátedra de Ingeniería de Software I (UNTDF) |

---

## 1. Alcance del Prototipo y Enfoque

El objetivo principal de este prototipo es implementar de forma ejecutable la lógica central del Caso de Uso Crítico **CU_04 (Solicitar préstamo de equipamiento audiovisual)**, incluyendo las reglas de negocio de antelación, topes por recursos (materia individual vs. grupal), lista negra y persistencia relacional local.

| Componente | Real / Simulado / Fuera de alcance | Nota |
| :--- | :--- | :--- |
| **Formulario web de solicitud** | Real | Interfaz responsiva HTML/CSS/JS con selector dinámico y feedback visual. |
| **Servicio de validación (`ValidationService`)** | Real | Evaluación síncrona/asíncrona de las 5 reglas de negocio de antelación, topes y sanciones. |
| **Base de Datos (SQLite)** | Real | Persistencia relacional local (`database.sqlite`) con esquema de usuarios, equipos y solicitudes. |
| **Servicio de Notificaciones (Email)** | Simulado | Logs simulados en consola para avisos de aprobación docente y excepciones. |
| **Módulos de Tutorías y Aulas (CU_01, CU_02)** | Fuera de alcance | Alcance reservado para entregas posteriores del sistema integral. |

### 1.1 Alternativas Evaluadas

| Criterio | Opción A: Single Page App (Node.js + Express + SQLite) | Opción B: Python (FastAPI + SQLite) |
| :--- | :--- | :--- |
| **Complejidad** | Baja. Integración directa de backend REST con vanilla JS. | Media. Requiere configuración de entorno virtual y ORM adicional. |
| **Cobertura del Spec** | Alta. Cubre el 100% de la lógica descrita en los diagramas. | Alta. Cobertura idéntica. |
| **Riesgo / Tiempo** | Muy bajo. Despliegue nativo ejecutable con `node server.js`. | Medio. Dependencias de entorno Runtime externas. |

**Decisión:** Se eligió la **Opción A (Node.js / Express + SQLite)** debido a su bajo acoplamiento, alta velocidad de ejecución local y soporte nativo para JSON en las llamadas entre cliente y servidor.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Motivo de la elección |
| :--- | :--- | :--- | :--- |
| **Frontend** | HTML5 / Vanilla JavaScript / CSS3 | ES6+ | Simplicidad de despliegue sin compiladores ni frameworks pesados. |
| **Backend** | Node.js / Express.js | LTS (v20+) | Manejo asíncrono liviano y fácil estructuración MVC. |
| **Persistencia** | SQLite3 | Native Driver | Cero configuración de servidor externo; portabilidad total (`database.sqlite`). |
| **Herramientas** | VS Code, Git / GitHub CLI | Latest | Entorno estandarizado de desarrollo guiado por especificación. |

### 2.1 Requisitos del Entorno
* **Runtime:** Node.js v18.x o superior / npm 9.x+
* **Instalación:** `npm install` (dependencias: `express`, `sqlite3`, `cors`).

---

## 3. Arquitectura
[ Cliente Web / index.html ]
│ (HTTP POST /api/prestamos)
▼
[ PrestamoController.js ] ──► [ ValidationService.js ]
│                              │
│                              ├──► [ Usuario.js ] (Consulta Lista Negra)
│                              └──► [ Equipo.js ]  (Consulta Stock / Topes)
▼
[ database.sqlite (SQLite3) ]
### 3.1 Componentes y Responsabilidades

| Componente | Responsabilidad | Depende de |
| :--- | :--- | :--- |
| **`PrestamoController.js`** | Recibir peticiones de la interfaz, coordinar la validación y registrar el estado de la solicitud en la BD. | `ValidationService.js`, `SolicitudPrestamo.js` |
| **`ValidationService.js`** | Ejecutar secuencialmente las reglas de negocio (Antelación $<48$ hs, Lista Negra, Stock, Topes). | `Usuario.js`, `Equipo.js` |
| **`Usuario.js`** | Representar la entidad de dominio y evaluar condiciones de sanción (`estaSancionado`). | `sqlite3` |
| **`Equipo.js`** | Consultar y verificar existencias en inventario (`getByIds`, `checkStock`). | `sqlite3` |
| **`SolicitudPrestamo.js`** | Encapsular el modelo de solicitud y el cálculo exacto de antelación en horas. | - |

### 3.2 Alineación con el Modelo de Clases del Proyecto

| Clase del Modelo | Implementación en Código | Cambios respecto del Modelo Original |
| :--- | :--- | :--- |
| **`Usuario`** | `src/models/Usuario.js` | Se añadió el método estático `estaSancionado(id)` para acelerar la consulta de sanciones. |
| **`Equipo`** | `src/models/Equipo.js` | Se añadieron los métodos estáticos `getByIds(ids)` y `checkStock(ids)` para manejo masivo de ítems. |
| **`SolicitudPrestamo`** | `src/models/SolicitudPrestamo.js` | Se incorporó el método `calcularAntelacionHoras()` directamente sobre las fechas recibidas. |

---

## 4. Diseño Detallado

### 4.1 Flujo Principal

1. El estudiante selecciona en la interfaz su usuario, la materia, la combinación de equipos y las horas de antelación.
2. Al hacer clic en **"Enviar Solicitud de Préstamo"**, el cliente dispara un `POST /api/prestamos` con el payload JSON.
3. `PrestamoController` pasa la solicitud a `ValidationService.validar(solicitud)`.
4. `ValidationService` verifica:
   * **Paso 4.1 (Lista Negra):** Consulta `Usuario.estaSancionado(estudianteId)`. Si es `true`, rechaza la solicitud (HTTP 403 / 400).
   * **Paso 4.2 (Topes):** Consulta `Equipo.getByIds(equipos)`. Si `!esGrupal` y se pide $>1$ Cámara o $>1$ Sonido, rechaza por tope excedido.
   * **Paso 4.3 (Stock):** Consulta `Equipo.checkStock(equipos)`. Si el stock disponible es insuficiente, rechaza.
   * **Paso 4.4 (Antelación):** Si antelación $<48$ hs, marca `esExcepcional = true` y sugiere estado `'Pendiente de autorizacion extraordinaria'`. De lo contrario, marca `'Pendiente de aprobacion docente'`.
5. Si pasa todas las validaciones, `PrestamoController` realiza el `INSERT` en SQLite y retorna la respuesta exitosa al frontend.

### 4.2 Estados y Transiciones (`SolicitudPrestamo`)

| Estado Inicial | Evento | Estado Siguiente | Efecto en el Sistema |
| :--- | :--- | :--- | :--- |
| **Nueva Solicitud** | Antelación $\ge 48$ hs hábiles | `Pendiente de aprobacion docente` | Bloquea stock provisorio; notifica al docente a cargo. |
| **Nueva Solicitud** | Antelación $< 48$ hs hábiles | `Pendiente de autorizacion extraordinaria` | Deriva a flujo de excepción (`CU_08`); notifica a la Dirección. |
| **Cualquiera** | Estudiante en Lista Negra | `Rechazada` | Cancela la transacción e informa mensaje de suspensión. |

### 4.3 Escenarios Alternativos y Manejo de Errores

| Extensión del CU | Condición | Comportamiento del Sistema |
| :--- | :--- | :--- |
| **Tope Excedido** | Solicita 2 Cámaras en materia individual (`esGrupal = false`). | Responde HTTP 400: *"Límite de recursos superado. Asocie una Materia Proyecto Grupal para solicitar equipamiento adicional."* |
| **Desbloqueo Grupal** | Solicita 2 Cámaras activando el tilde *"¿Es Proyecto Grupal?"*. | Aprueba la validación y procesa el registro en la base de datos. |
| **Lista Negra** | ID de usuario con `enListaNegra = 1`. | Responde HTTP 400: *"Cuenta suspendida por la Dirección. No puede realizar solicitudes."* |

---

## 5. Modelo de Datos (SQLite)

```sql
-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL,
    enListaNegra BOOLEAN DEFAULT 0
);

-- Tabla de Equipos
CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    stockDisponible INTEGER NOT NULL
);

-- Tabla de Solicitudes de Préstamo
CREATE TABLE IF NOT EXISTS solicitudes_prestamo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id INTEGER NOT NULL,
    materia_nombre TEXT NOT NULL,
    fechaRetiro TEXT NOT NULL,
    fechaDevolucionPactada TEXT NOT NULL,
    estado TEXT NOT NULL,
    esExcepcional BOOLEAN DEFAULT 0,
    FOREIGN KEY(estudiante_id) REFERENCES usuarios(id)
);

## 6. Interfaces (API REST)

### 6.1 Endpoints Internos

| Método | Ruta | Entrada (Body) | Salida (200 / 400) | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/prestamos` | `{ estudianteId, materiaNombre, equipos, horasAntelacion, esGrupal }` | `{ mensaje, solicitudId, estado, esExcepcional }` | Procesa y registra la solicitud de préstamo si cumple con las reglas. |

## 7. Estructura del Código

ProyectoIS/
├── database.sqlite            # Base de datos relacional local
├── ENTREGA_FASE_BUILD.md      # Resumen ejecutivo de entrega
├── package.json               # Dependencias del proyecto Node.js
├── RFC_CU04_Prestamo.md       # Especificación técnica RFC (Este documento)
├── server.js                  # Servidor Express HTTP
├── test-validation.js         # Suite de pruebas unitarias automáticas
└── src/
    ├── config/
    │   └── database.js        # Script de inicialización y carga de Seed (init-db)
    ├── controllers/
    │   └── PrestamoController.js # Controlador HTTP del flujo de préstamo
    ├── models/
    │   ├── Equipo.js          # Entidad Equipo y métodos de inventario
    │   ├── SolicitudPrestamo.js# Entidad de dominio Solicitud
    │   └── Usuario.js         # Entidad Usuario y verificación de sanciones
    ├── public/
    │   ├── app.js             # Lógica cliente JS de la interfaz web
    │   └── index.html         # Formulario web de captura y presentación
    └── services/
        └── ValidationService.js # Servicio central de reglas de negocio

### 7.1 Ejecución del Prototipo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Inicializar base de datos SQLite y datos de prueba
npm run init-db

# 3. Ejecutar pruebas unitarias
node test-validation.js

# 4. Levantar servidor local
node server.js

---

## 8. Plan de Verificación

### Caso de Prueba 01: Antelación Regular (>= 48 hs)
* **Criterio de Aceptación:** Solicitud con 72 hs de anticipación.
* **Procedimiento:** Seleccionar estudiante activo, antelación de 72 hs y enviar solicitud.
* **Resultado Esperado:** Estado registrado como `Pendiente de aprobacion docente` (`esExcepcional: false`).
* **Resultado Obtenido:** **PASSED**

---

### Caso de Prueba 02: Antelación Excepcional (< 48 hs)
* **Criterio de Aceptación:** Solicitud con 12 hs de anticipación.
* **Procedimiento:** Seleccionar estudiante activo, antelación de 12 hs y enviar solicitud.
* **Resultado Esperado:** Estado registrado como `Pendiente de autorizacion extraordinaria` (`esExcepcional: true`).
* **Resultado Obtenido:** **PASSED**

---

### Caso de Prueba 03: Tope Excedido en Materia Individual
* **Criterio de Aceptación:** Límite de 1 Cámara y 1 Sonido en proyecto no grupal.
* **Procedimiento:** Seleccionar 2 Kits de Cámara sin activar el tilde de Proyecto Grupal.
* **Resultado Esperado:** Rechazo HTTP 400: *"Límite de recursos superado. Asocie una Materia Proyecto Grupal para solicitar equipamiento adicional."*
* **Resultado Obtenido:** **PASSED**

---

### Caso de Prueba 04: Desbloqueo de Tope por Materia Grupal
* **Criterio de Aceptación:** Permitir equipamiento adicional si es proyecto grupal.
* **Procedimiento:** Seleccionar 2 Kits de Cámara activando el tilde de Proyecto Grupal (`esGrupal = true`).
* **Resultado Esperado:** Solicitud validada y registrada con éxito en la base de datos.
* **Resultado Obtenido:** **PASSED**

---

### Caso de Prueba 05: Bloqueo por Lista Negra
* **Criterio de Aceptación:** Impedir solicitudes a usuarios suspendidos.
* **Procedimiento:** Seleccionar estudiante en lista negra (ID 3) y enviar solicitud.
* **Resultado Esperado:** Rechazo HTTP 400/403: *"Cuenta suspendida por la Dirección. No puede realizar solicitudes."*
* **Resultado Obtenido:** **PASSED**

---

## 9. Riesgos y Preguntas Abiertas

* **Riesgo 1: Persistencia local en SQLite ante caídas del servidor**
  * **Impacto:** Bajo.
  * **Mitigación:** Se implementó reconstrucción automática mediante script `npm run init-db` y transacciones seguras en el driver SQLite.

* **Riesgo 2: Sincronización del cálculo de antelación entre UI y Backend**
  * **Impacto:** Medio.
  * **Mitigación:** El backend en `ValidationService.js` valida de forma desacoplada la antelación real en horas, ignorando manipulación en el cliente.

---

## 10. Historial de Cambios

* **Versión 1.0 (18/11/2026)**
  * **Autor:** Grupo N° 2
  * **Descripción:** Versión final implementada, probada y validada en entorno local con SQLite.
* **Versión 1.1 (18/11/2026)**
  * **Autor:** Grupo N° 2
  * **Descripción:** Ajustes de alineación RFC–código (Playbook SDD, fase Validate):
    * **Persistencia de equipos:** nueva tabla `solicitud_equipos` (solicitud_id, equipo_id), un registro por unidad solicitada.
    * **Horas hábiles:** la antelación se calcula en horas hábiles (lunes a viernes). Los feriados quedan **fuera de alcance**. Se agrega TC-06.
    * **CU_08 (Autorización Extraordinaria):** **Simulado**. Con antelación < 48 hs hábiles la solicitud queda en `Pendiente de autorizacion extraordinaria` y se emite una notificación simulada por consola. El flujo de aprobación de CU_08 queda fuera de alcance de este prototipo.
    * **Pruebas:** `test-validation.js` usa fecha fija y verifica el código de error en TC-03 y TC-05 (antes marcaban PASSED sin verificar).
