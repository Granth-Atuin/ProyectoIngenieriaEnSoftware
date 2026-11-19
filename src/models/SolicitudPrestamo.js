class SolicitudPrestamo {
    constructor(data) {
        this.estudianteId = data.estudianteId;
        this.materiaNombre = data.materiaNombre;
        this.equipos = data.equipos; // Array de IDs
        this.fechaRetiro = new Date(data.fechaRetiro);
        this.fechaDevolucion = new Date(data.fechaDevolucion);
        this.esGrupal = data.esGrupal || false;
        this.estado = 'Iniciado';
    }

    // La antelación se mide en horas hábiles (lunes a viernes; se excluyen sábados y domingos).
    // Los feriados quedan fuera del alcance del prototipo.
    calcularAntelacionHoras(ahora = new Date()) {
        const diffMs = this.fechaRetiro - ahora;
        if (diffMs <= 0) return diffMs / (1000 * 60 * 60);

        let habilMs = 0;
        let cursor = new Date(ahora);
        while (cursor < this.fechaRetiro) {
            const finDia = new Date(cursor);
            finDia.setHours(24, 0, 0, 0);
            const fin = finDia < this.fechaRetiro ? finDia : this.fechaRetiro;
            const dia = cursor.getDay();
            if (dia !== 0 && dia !== 6) habilMs += fin - cursor;
            cursor = fin;
        }
        return habilMs / (1000 * 60 * 60);
    }
}

module.exports = SolicitudPrestamo;
