const SolicitudPrestamo = require('./src/models/SolicitudPrestamo');
const ValidationService = require('./src/services/ValidationService');

// Fecha "actual" fija (lunes 16/11/2026 10:00) para que las horas hábiles sean deterministas
const HOY = new Date(2026, 10, 16, 10, 0, 0);
const JUEVES = new Date(2026, 10, 19, 10, 0, 0).toISOString();  // 72 hs hábiles
const LUNES_NOCHE = new Date(2026, 10, 16, 22, 0, 0).toISOString(); // 12 hs

function crear(extra) {
    return new SolicitudPrestamo(Object.assign({
        estudianteId: 2,
        materiaNombre: 'Taller I',
        equipos: [1],
        fechaRetiro: JUEVES,
        fechaDevolucion: JUEVES,
        esGrupal: false
    }, extra));
}

function resultado(ok) { console.log(ok ? '✅ PASSED' : '❌ FAILED'); return ok; }

async function runTests() {
    console.log('=== Iniciando Pruebas de Validación (TC-xx) ===\n');
    const r = [];

    console.log('TC-01: Antelación >= 48 hs hábiles...');
    const r1 = await ValidationService.validar(crear(), HOY);
    console.log(`Resultado: ${r1.estadoSugerido}`);
    r.push(resultado(r1.valido && r1.estadoSugerido === 'Pendiente de aprobacion docente'));

    console.log('\nTC-02: Antelación < 48 hs hábiles (Excepcional, CU_08)...');
    const r2 = await ValidationService.validar(crear({ fechaRetiro: LUNES_NOCHE }), HOY);
    console.log(`Resultado: ${r2.estadoSugerido} | Excepcional: ${r2.esExcepcional}`);
    r.push(resultado(r2.valido && r2.esExcepcional && r2.estadoSugerido === 'Pendiente de autorizacion extraordinaria'));

    console.log('\nTC-03: Tope excedido (2 cámaras, no grupal)...');
    const r3 = await ValidationService.validar(crear({ equipos: [1, 1] }), HOY);
    console.log(`Resultado: ${r3.error}`);
    r.push(resultado(!r3.valido && r3.codigo === 'TOPE_EXCEDIDO'));

    console.log('\nTC-04: Tope permitido (2 cámaras, grupal)...');
    const r4 = await ValidationService.validar(crear({ equipos: [1, 1], esGrupal: true }), HOY);
    console.log(`Resultado: Válido = ${r4.valido}`);
    r.push(resultado(r4.valido));

    console.log('\nTC-05: Bloqueo por Lista Negra...');
    const r5 = await ValidationService.validar(crear({ estudianteId: 3 }), HOY);
    console.log(`Resultado: ${r5.error}`);
    r.push(resultado(!r5.valido && r5.codigo === 'LISTA_NEGRA'));

    console.log('\nTC-06: El fin de semana no suma horas hábiles...');
    // Viernes 10:00 -> lunes 10:00 = 14 hs (viernes) + 10 hs (lunes) = 24 hs hábiles (<48)
    const viernes = new Date(2026, 10, 20, 10, 0, 0);
    const lunes = new Date(2026, 10, 23, 10, 0, 0).toISOString();
    const r6 = await ValidationService.validar(crear({ fechaRetiro: lunes }), viernes);
    console.log(`Resultado: ${r6.estadoSugerido} (${r6.antelacionHoras} hs hábiles)`);
    r.push(resultado(r6.valido && r6.esExcepcional && Number(r6.antelacionHoras) === 24));

    console.log(`\n${r.filter(Boolean).length}/${r.length} pruebas aprobadas`);
    if (r.includes(false)) process.exitCode = 1;
}

runTests().catch(console.error);
