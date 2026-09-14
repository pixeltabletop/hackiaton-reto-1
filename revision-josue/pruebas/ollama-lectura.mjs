const casos = [
  { id: 'negacion-docs', esperado: { documentos_adjuntos: ['informe del cirujano','consentimiento informado'], preexistencias: [], caracter: 'electiva' },
    texto: 'Carácter: electiva\nDocumentos adjuntos: informe del cirujano, consentimiento informado; pendiente estudio de imagen y orden de anestesiología\nAntecedentes: sin antecedentes crónicos declarados.' },
  { id: 'preexistencia-trampa', esperado: { documentos_adjuntos: ['informe del cirujano','estudio de imagen','orden de anestesiología','consentimiento informado'], preexistencias: ['hipertensión arterial'], caracter: 'electiva' },
    texto: 'Carácter: programada\nDocumentos adjuntos: informe del cirujano, estudio de imagen, orden de anestesiología, consentimiento informado\nPreexistencias declaradas: Hipertensión arterial desde 2024, sin antecedentes quirúrgicos.' },
  { id: 'urgencia-prosa', esperado: { documentos_adjuntos: ['informe de urgencias','consentimiento informado'], preexistencias: [], caracter: 'urgente' },
    texto: 'Paciente ingresa por emergencias con dolor abdominal de 14 horas; se decide cirugía inmediata por riesgo vital. Se adjunta informe de urgencias y el consentimiento informado firmado. Niega enfermedades previas.' },
];
const prompt = (t) => `Extrae de este informe médico SOLO lo que está afirmado. Responde JSON con: documentos_adjuntos (lista de documentos que SÍ se adjuntan, no los pendientes), preexistencias (lista de enfermedades previas declaradas), caracter ("electiva" | "urgente" | "emergencia").\n\nINFORME:\n${t}`;
for (const modelo of ['qwen3:1.7b', 'qwen2.5:1.5b-instruct']) {
  for (const c of casos) {
    const t0 = Date.now();
    const r = await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: modelo, prompt: prompt(c.texto), format: 'json', stream: false, think: false, options: { temperature: 0 } }) }).then((x) => x.json());
    let salida; try { salida = JSON.parse(r.response); } catch { salida = r.response; }
    const docsOk = JSON.stringify((salida.documentos_adjuntos ?? []).map(s=>String(s).toLowerCase()).sort()) === JSON.stringify(c.esperado.documentos_adjuntos.sort());
    const preOk = (salida.preexistencias ?? []).length === c.esperado.preexistencias.length;
    const carOk = salida.caracter === c.esperado.caracter;
    console.log(`${modelo} · ${c.id} · ${((Date.now()-t0)/1000).toFixed(1)} s · docs ${docsOk?'OK':'MAL'} · preexist ${preOk?'OK':'MAL'} · carácter ${carOk?'OK':'MAL'}\n   ${JSON.stringify(salida)}`);
  }
}
