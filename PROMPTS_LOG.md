# Registro de prompts (SDD con IA)

Registro resumido del desarrollo guiado por IA, según SDD_PLAYBOOK.md (Plan → Build → Validate).

| Fase | Prompt (resumen) | Resultado | Revisión humana |
| :--- | :--- | :--- | :--- |
| Plan | "Completá RFC_TEMPLATE.md para CU_04 (préstamo de equipos). No escribas código. Listá ambigüedades y definí TC-xx." | `RFC_CU04_Prestamo.md` | Grupo revisó y aprobó (Gate 1) |
| Build | "Implementá por tareas chicas según el RFC: BD SQLite, modelos, ValidationService, API REST, UI." | Código en `src/`, `server.js` | Grupo ejecutó y revisó el diff (Gate 2) |
| Validate | "Ejecutá los TC-01..TC-05 y verificá trazabilidad con el RFC." | `test-validation.js`, `ENTREGA_FASE_BUILD.md` | Grupo validó resultados (Gate 3) |
| Validate (ajuste) | "Corregí desvíos RFC–código: persistir equipos, horas hábiles, CU_08 simulado, tests que verifiquen." | RFC v1.1, TC-06 | Grupo revisó cambios |
