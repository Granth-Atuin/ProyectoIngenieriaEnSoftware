const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Limpiar tablas existentes para resetear el AUTOINCREMENT
    db.run(`DROP TABLE IF EXISTS solicitud_equipos`);
    db.run(`DROP TABLE IF EXISTS solicitudes_prestamo`);
    db.run(`DROP TABLE IF EXISTS equipos`);
    db.run(`DROP TABLE IF EXISTS usuarios`);

    // 2. Crear tablas
    db.run(`CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL,
        enListaNegra BOOLEAN DEFAULT 0
    )`);

    db.run(`CREATE TABLE equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        stockDisponible INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE solicitudes_prestamo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante_id INTEGER NOT NULL,
        materia_nombre TEXT NOT NULL,
        fechaRetiro TEXT NOT NULL,
        fechaDevolucionPactada TEXT NOT NULL,
        estado TEXT NOT NULL,
        esExcepcional BOOLEAN DEFAULT 0,
        FOREIGN KEY(estudiante_id) REFERENCES usuarios(id)
    )`);

    db.run(`CREATE TABLE solicitud_equipos (
        solicitud_id INTEGER NOT NULL,
        equipo_id INTEGER NOT NULL,
        FOREIGN KEY(solicitud_id) REFERENCES solicitudes_prestamo(id),
        FOREIGN KEY(equipo_id) REFERENCES equipos(id)
    )`);

    // 3. Insertar Seed con IDs fijos garantizados (1, 2, 3)
    db.run(`INSERT INTO usuarios (id, nombre, rol, enListaNegra) VALUES (1, 'Dr. Juan Docente', 'DOCENTE', 0)`);
    db.run(`INSERT INTO usuarios (id, nombre, rol, enListaNegra) VALUES (2, 'Estudiante Activo', 'ESTUDIANTE', 0)`);
    db.run(`INSERT INTO usuarios (id, nombre, rol, enListaNegra) VALUES (3, 'Estudiante Sancionado', 'ESTUDIANTE', 1)`);

    db.run(`INSERT INTO equipos (id, nombre, categoria, stockDisponible) VALUES (1, 'Kit Cámara', 'Camara', 3)`);
    db.run(`INSERT INTO equipos (id, nombre, categoria, stockDisponible) VALUES (2, 'Kit Sonido', 'Sonido', 2)`);
    db.run(`INSERT INTO equipos (id, nombre, categoria, stockDisponible) VALUES (3, 'Trípode', 'Accesorio', 5)`);

    console.log("Tablas creadas exitosamente.");
    console.log("Datos iniciales (Seed) cargados correctamente con IDs 2 (Activo) y 3 (Sancionado).");
});

db.close();

