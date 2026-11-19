const Usuario = require('../models/Usuario');
const Equipo = require('../models/Equipo');

class ValidationService {
    static async validar(solicitud, ahora = new Date()) {
        const errors = [];

        // 1. Bloqueo por Lista Negra (TC-05)
        const sancionado = await Usuario.estaSancionado(solicitud.estudianteId);
        if (sancionado) {
            return {
                valido: false,
                error: "Cuenta suspendida por la Dirección. No puede realizar solicitudes.",
                codigo: "LISTA_NEGRA"
            };
        }

        // 2. Validación de Topes (TC-03, TC-04)
        // Según RFC: Máximo 1 Cámara y 1 Sonido si no es grupal
        if (!solicitud.esGrupal) {
            const infoEquipos = await Equipo.getByIds(solicitud.equipos);
            const camaras = infoEquipos.filter(e => e.categoria === 'Camara').length;
            const sonidos = infoEquipos.filter(e => e.categoria === 'Sonido').length;

            if (camaras > 1 || sonidos > 1) {
                return {
                    valido: false,
                    error: "Límite de recursos superado. Asocie una Materia Proyecto Grupal para solicitar equipamiento adicional.",
                    codigo: "TOPE_EXCEDIDO"
                };
            }
        }

        // 3. Verificación de Stock (Simplificado para el prototipo)
        const hayStock = await Equipo.checkStock(solicitud.equipos);
        if (!hayStock) {
            return {
                valido: false,
                error: "Uno o más equipos seleccionados no están disponibles en las fechas solicitadas.",
                codigo: "SIN_STOCK"
            };
        }

        // 4. Validación de Antelación (TC-01, TC-02)
        const antelacion = solicitud.calcularAntelacionHoras(ahora);
        let estadoSugerido = 'Pendiente de aprobacion docente';
        let esExcepcional = false;

        if (antelacion < 0) {
            return { valido: false, error: "La fecha de retiro no puede ser en el pasado.", codigo: "FECHA_INVALIDA" };
        }

        if (antelacion < 48) {
            estadoSugerido = 'Pendiente de autorizacion extraordinaria';
            esExcepcional = true;
        }

        return {
            valido: true,
            estadoSugerido,
            esExcepcional,
            antelacionHoras: antelacion.toFixed(2)
        };
    }
}

module.exports = ValidationService;

