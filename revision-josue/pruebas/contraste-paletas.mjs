const hex = (h) => [1,3,5].map((i) => parseInt(h.slice(i, i+2), 16));
const lum = (h) => { const [r,g,b] = hex(h).map((v) => { v/=255; return v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; }); return 0.2126*r + 0.7152*g + 0.0722*b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x+0.05)/(y+0.05)).toFixed(2); };
const paletas = {
  'A Petróleo clínico (recomendada)': { fondo:'#F4F7F7', superficie:'#FFFFFF', tinta:'#10262D', secundario:'#4D6269', acento:'#0B5F6E', acentoSuave:'#DDEDEF', oscuroFondo:'#0C1A1E', oscuroSuperficie:'#132429', oscuroTinta:'#E6F0F1', oscuroSecundario:'#9DB3B8', oscuroAcento:'#5FC3D1' },
  'B Verde quirófano': { fondo:'#F3F7F4', superficie:'#FFFFFF', tinta:'#112A20', secundario:'#4C6358', acento:'#17684B', acentoSuave:'#DCEFE5', oscuroFondo:'#0B1914', oscuroSuperficie:'#12241D', oscuroTinta:'#E5F1EA', oscuroSecundario:'#9BB6A9', oscuroAcento:'#63C79C' },
  'C Azul póliza': { fondo:'#F4F6FA', superficie:'#FFFFFF', tinta:'#101E36', secundario:'#4D5B72', acento:'#1D4F91', acentoSuave:'#DFE8F5', oscuroFondo:'#0B1322', oscuroSuperficie:'#121D31', oscuroTinta:'#E5ECF6', oscuroSecundario:'#9EAECA', oscuroAcento:'#7FAEF0' },
};
const estados = { // texto sobre su lavado, tema claro | tema oscuro
  'Pre-aprobado': ['#1D6B3F','#E3F2E8','#7ED3A0','#12291C'],
  'Con condiciones': ['#1F5A9E','#E2ECF8','#8DB8EE','#132338'],
  'Documentos faltantes': ['#7A5200','#FBF0D4','#F0C46A','#2B2210'],
  'Carencia no cumplida': ['#8F3F0C','#FBE6D8','#F2A574','#2E1B10'],
  'No cubierto': ['#A8201A','#FBE3E1','#F59A93','#301413'],
  'Deriva al auditor': ['#5A3E9E','#ECE6F8','#BCA6F0','#211A33'],
};
const out = { paletas: {}, estados: {} };
for (const [n, p] of Object.entries(paletas)) out.paletas[n] = {
  'tinta/fondo': ratio(p.tinta, p.fondo), 'secundario/fondo': ratio(p.secundario, p.fondo), 'acento/superficie': ratio(p.acento, p.superficie),
  'acento/acentoSuave': ratio(p.acento, p.acentoSuave), 'blanco/acento (botón)': ratio('#FFFFFF', p.acento),
  'oscuro tinta/fondo': ratio(p.oscuroTinta, p.oscuroFondo), 'oscuro secundario/superficie': ratio(p.oscuroSecundario, p.oscuroSuperficie), 'oscuro acento/superficie': ratio(p.oscuroAcento, p.oscuroSuperficie),
};
for (const [n, [t, l, td, ld]] of Object.entries(estados)) out.estados[n] = { claro: ratio(t, l), claroSobreBlanco: ratio(t, '#FFFFFF'), oscuro: ratio(td, ld) };
const min = Math.min(...Object.values(out.paletas).flatMap(Object.values), ...Object.values(out.estados).flatMap(Object.values));
console.log(JSON.stringify(out, null, 1)); console.log('MINIMO', min, min >= 4.5 ? 'todo AA texto normal' : 'REVISAR');
