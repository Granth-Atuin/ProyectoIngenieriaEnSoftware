const SolicitudPrestamo = require('../models/SolicitudPrestamo');
const ValidationService = require('../services/ValidationService');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../../database.sqlite');

const PrestamoController = {
  async crearSolicitud(req, res) {
    const { estudianteId, materiaNombre, equipos, fechaRetiro, fechaDevolucion, esGrupal } = req.body;

    try {
      const solicitudData = new SolicitudPrestamo({ 
        estudianteId, 
        materiaNombre, 
        equipos, 
        fechaRetiro, 
        fechaDevolucion, 
        esGrupal 
      });

      const validacion = await ValidationService.validar(solicitudData);

      if (!validacion.valido) {
        return res.status(400).json({ 
          error: validacion.error || validacion.mensaje || 'Solicitud rechazada por reglas de negocio.' 
        });
      }

      const db = new sqlite3.Database(dbPath);
      const estado = validacion.estadoSugerido || 'Pendiente de aprobacion docente';
      const esExcepcional = validacion.esExcepcional ? 1 : 0;

      db.run(
        `INSERT INTO solicitudes_prestamo (estudiante_id, materia_nombre, fechaRetiro, fechaDevolucionPactada, estado, esExcepcional)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [estudianteId, materiaNombre, fechaRetiro, fechaDevolucion, estado, esExcepcional],
        function(insertErr) {
          if (insertErr) { db.close(); return res.status(500).json({ error: insertErr.message }); }
          const solicitudId = this.lastID;

          // Persistir los equipos solicitados (un registro por unidad)
          const stmt = db.prepare('INSERT INTO solicitud_equipos (solicitud_id, equipo_id) VALUES (?, ?)');
          (equipos || []).forEach(eqId => stmt.run(solicitudId, eqId));
          stmt.finalize((eqErr) => {
            db.close();
            if (eqErr) return res.status(500).json({ error: eqErr.message });

            // Notificación simulada (declarada como "Simulado" en el RFC)
            if (esExcepcional) {
              console.log(`[SIMULADO][CU_08] Solicitud #${solicitudId} derivada a Autorización Extraordinaria. Notificación a la Dirección.`);
            } else {
              console.log(`[SIMULADO] Solicitud #${solicitudId} pendiente. Notificación al docente a cargo.`);
            }

            res.json({
              mensaje: 'Solicitud creada con éxito',
              solicitudId,
              estado,
              esExcepcional: !!esExcepcional
            });
          });
        }
      );    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};

module.exports = PrestamoController;
