// Interfaz, almacenamiento local y conexión con Google Maps (Places + Routes, API nueva por REST).
const $ = id => document.getElementById(id);
const KEY_CFG = 'traslados.config', KEY_HIST = 'traslados.historial', KEY_API = 'traslados.apikey';
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const clone = o => JSON.parse(JSON.stringify(o));
let cfg = Object.assign(clone(DEFAULTS), load(KEY_CFG, {}));
let hist = load(KEY_HIST, []);
let last = null;
const S = n => 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const save = () => localStorage.setItem(KEY_CFG, JSON.stringify(cfg));

// ---------- Pestañas ----------
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('main > section').forEach(s => s.hidden = s.id !== b.dataset.tab);
  if (b.dataset.tab === 'hist') renderHist();
});

// ---------- Calculadora ----------
const ids = ['km', 'minutos', 'peaje', 'cochera', 'otros'];
$('peaje').value = cfg.peaje; $('cochera').value = 0; $('otros').value = 0;
const toMin = v => $('unidad').value === 'h' ? (parseFloat(v) || 0) * 60 : v; // el motor trabaja en minutos
const trip = () => ({ ...Object.fromEntries(ids.map(i => [i, $(i).value])), minutos: toMin($('minutos').value), idaVuelta: $('idaVuelta').checked });
$('unidad').onchange = () => { // convierte el valor mostrado a la nueva unidad y recuerda la elección
  const u = $('unidad').value, v = parseFloat($('minutos').value);
  if (!isNaN(v)) $('minutos').value = u === 'h' ? +(v / 60).toFixed(2) : Math.round(v * 60);
  $('minutos').step = u === 'h' ? '0.01' : '1'; cfg.unidadTiempo = u; save(); recalc();
};
function recalc() {
  const t = trip(); last = { t, r: calcular(cfg, t) }; const r = last.r;
  $('precio').textContent = S(r.precio);
  const rows = [['Distancia cobrada', r.km.toFixed(1) + ' km'], ['Tiempo cobrado', r.horas.toFixed(2) + ' h (' + Math.round(r.horas * 60) + ' min)'],
    ['Costo fijo (tiempo)', S(r.fijo)], ['Costo variable (km)', S(r.variable)], ['Peajes, cochera y otros', S(r.extras)],
    ['Costo del viaje', S(r.costo)], ['Con IGV (' + (cfg.igv * 100).toFixed(0) + '%)', S(r.conIgv)],
    ['Margen (' + (cfg.margen * 100).toFixed(1) + '%)', S(r.precio - r.conIgv)]];
  $('desglose').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
}
[...ids, 'idaVuelta'].forEach(i => $(i).addEventListener('input', recalc));

function msg(t, err) { $('msg').textContent = t; $('msg').className = err ? 'err' : ''; }

// ---------- Mapas (OpenRouteService o Google) ----------
const KEY_PROV = 'traslados.proveedor', KEY_ORS = 'traslados.orskey';
const prov = () => localStorage.getItem(KEY_PROV) || 'ors';
const key = () => localStorage.getItem(prov() === 'ors' ? KEY_ORS : KEY_API) || '';
const f = (...a) => fetch(...a);
$('prov').value = prov(); $('orskey').value = localStorage.getItem(KEY_ORS) || ''; $('apikey').value = localStorage.getItem(KEY_API) || '';
$('prov').onchange = e => localStorage.setItem(KEY_PROV, e.target.value);
$('orskey').onchange = e => localStorage.setItem(KEY_ORS, e.target.value.trim());
$('apikey').onchange = e => localStorage.setItem(KEY_API, e.target.value.trim());

const buscar = (txt, auto) => prov() === 'ors' ? GEO.orsBuscar(txt, key(), f, auto) : GEO.googleBuscar(txt, key(), f);
const sel = {}; // dirección elegida por campo, con coordenadas
const noKey = () => !key() && (msg('Falta la API key de ' + (prov() === 'ors' ? 'OpenRouteService' : 'Google Maps') + '. Ingrésala en la pestaña Parámetros.', true), true);

function elegir(campo, p) { $(campo).value = p.label; sel[campo] = p; }

async function ruta() {
  const o = $('origen').value.trim(), d = $('destino').value.trim();
  if (!o || !d) return msg('Ingresa origen y destino.', true);
  if (noKey()) return;
  msg('Calculando ruta…'); $('btnRuta').disabled = true;
  try {
    let r, nota = '', url;
    if (prov() === 'ors') {
      const pts = [];
      for (const c of ['origen', 'destino']) {
        let p = sel[c];
        if (!p) { p = (await buscar($(c).value.trim(), false))[0]; if (!p) throw new Error('No se encontró la dirección de ' + c + '. Usa “Verificar dirección”.'); elegir(c, p); if (p.nivel !== 'ok') nota += ` ${c[0].toUpperCase() + c.slice(1)}: ${p.texto.toLowerCase()}.`; }
        pts.push(p);
      }
      r = await GEO.orsRuta(pts[0], pts[1], key(), f);
      url = `https://www.google.com/maps/dir/?api=1&origin=${pts[0].lat},${pts[0].lon}&destination=${pts[1].lat},${pts[1].lon}`;
      nota += ' El tiempo no incluye tráfico en tiempo real.';
    } else {
      const gp = c => (sel[c] && sel[c].lat != null) ? sel[c] : $(c).value.trim();
      const q = p => typeof p === 'string' ? encodeURIComponent(p) : p.lat + ',' + p.lon;
      r = await GEO.googleRuta(gp('origen'), gp('destino'), key(), f);
      url = `https://www.google.com/maps/dir/?api=1&origin=${q(gp('origen'))}&destination=${q(gp('destino'))}`;
    }
    $('km').value = r.km.toFixed(1); $('minutos').value = $('unidad').value === 'h' ? (r.min / 60).toFixed(2) : Math.round(r.min);
    $('verMapa').href = url; $('verMapa').hidden = false;
    msg('Ruta calculada. Puedes ajustar km y minutos.' + nota); recalc();
  } catch (e) { msg('Error de mapas: ' + e.message, true); }
  $('btnRuta').disabled = false;
}
$('btnRuta').onclick = ruta;

// Botón "Verificar dirección": abre el mapa para confirmar o corregir el punto
async function abrirMapa(campo) {
  if (noKey()) return;
  const txt = $(campo).value.trim(), ors = prov() === 'ors';
  let punto = sel[campo] && sel[campo].lat != null ? sel[campo] : null, info = '';
  if (!punto && txt && ors) { try { const r = (await buscar(txt, false))[0]; if (r) { punto = r; info = r.texto + ': ' + r.label + '. '; } else info = 'No se encontró esa dirección. '; } catch (e) { info = 'Error de mapas: ' + e.message + '. '; } }
  MAPA.abrir({ motor: ors ? 'osm' : 'google', key: key(), titulo: campo === 'origen' ? 'Verificar origen' : 'Verificar destino', punto, texto: txt,
    info: info + 'Si no es la dirección correcta, haz clic en el mapa o arrastra el marcador.',
    reverse: (la, lo) => GEO.orsReverse(la, lo, key(), f),
    onOk: p => { elegir(campo, p); if ($('origen').value.trim() && $('destino').value.trim()) ruta(); else msg('Punto confirmado. Falta definir el otro extremo del viaje.'); } });
}
document.querySelectorAll('[data-v]').forEach(b => b.onclick = () => abrirMapa(b.dataset.v));

// Autocompletado mientras escribes
function autocomplete(input) {
  const ul = input.nextElementSibling; let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer); ul.innerHTML = ''; delete sel[input.id];
    if (input.value.length < 4 || !key()) return;
    timer = setTimeout(async () => {
      try {
        const res = await buscar(input.value, true); ul.innerHTML = '';
        res.forEach(p => { const li = document.createElement('li'); li.textContent = p.label; li.onmousedown = () => { elegir(input.id, p); ul.innerHTML = ''; }; ul.appendChild(li); });
      } catch { /* sin sugerencias; escribe la dirección completa y usa Verificar */ }
    }, 400);
  });
  input.addEventListener('blur', () => setTimeout(() => ul.innerHTML = '', 150));
}
autocomplete($('origen')); autocomplete($('destino'));

// ---------- Parámetros ----------
const P = [['Personal', [['sueldo', 'Remuneración mensual (S/)'], ['carga', 'Carga social (%)', 1], ['horasMes', 'Horas de trabajo al mes']]],
  ['Costos fijos mensuales', [['galonPrecio', 'Gasolina: precio por galón (S/)'], ['galonSem', 'Gasolina: galones por semana'], ['semMes', 'Semanas por mes'], ['lavado', 'Lavado: costo (S/)'], ['lavadoSem', 'Lavados por semana']]],
  ['Combustible por kilómetro', [['glp', 'Precio del galón GLP (S/)'], ['rend', 'Rendimiento (km por galón)']]],
  ['Precio y valores por defecto', [['igv', 'IGV (%)', 1], ['margen', 'Margen de utilidad (%)', 1], ['peaje', 'Peaje por defecto (S/)'], ['cochera', 'Cochera por defecto (S/)'], ['minExtra', 'Minutos extra por viaje (espera, gestión)']]]];
$('form').innerHTML = P.map(([t, fs]) => `<div class="panel"><h2>${t}</h2><div class="fgrid">${fs.map(([k, l, p]) =>
  `<label>${l}<input data-k="${k}" data-p="${p || ''}" type="number" step="any"></label>`).join('')}</div></div>`).join('');
function fillForm() { document.querySelectorAll('[data-k]').forEach(i => i.value = i.dataset.p ? +(cfg[i.dataset.k] * 100).toFixed(4) : cfg[i.dataset.k]); }
$('form').addEventListener('input', e => { const i = e.target; cfg[i.dataset.k] = i.dataset.p ? +i.value / 100 : +i.value; save(); resumen(); recalc(); });

function renderVars() {
  $('vars').innerHTML = '<tr><th>Incluir</th><th>Concepto</th><th>Cada (km)</th><th>Costo (S/)</th><th>Factor</th><th>S/ por km</th><th></th></tr>' +
    cfg.variables.map((v, i) => `<tr><td><input type="checkbox" data-i="${i}" data-f="on" ${v.on ? 'checked' : ''}></td>
    <td><input data-i="${i}" data-f="n" value="${v.n}"></td><td><input type="number" data-i="${i}" data-f="km" value="${v.km}"></td>
    <td><input type="number" step="any" data-i="${i}" data-f="costo" value="${v.costo}"></td><td><input type="number" step="any" data-i="${i}" data-f="f" value="${v.f}"></td>
    <td id="pk${i}">${(v.costo * v.f / (v.km || 1)).toFixed(4)}</td><td><button data-del="${i}" title="Quitar">✕</button></td></tr>`).join('');
}
$('vars').addEventListener('input', e => {
  const i = e.target.dataset.i; if (i == null) return; const f = e.target.dataset.f, v = cfg.variables[i];
  v[f] = f === 'on' ? e.target.checked : f === 'n' ? e.target.value : +e.target.value;
  $('pk' + i).textContent = (v.costo * v.f / (v.km || 1)).toFixed(4); save(); resumen(); recalc();
});
$('vars').addEventListener('click', e => { if (e.target.dataset.del != null) { cfg.variables.splice(e.target.dataset.del, 1); save(); renderVars(); resumen(); recalc(); } });
$('addVar').onclick = () => { cfg.variables.push({ n: 'Nuevo concepto', km: 10000, costo: 0, f: 1, on: true }); save(); renderVars(); };
function resumen() {
  $('resumen').innerHTML = [['Costo fijo mensual', S(costoFijoMensual(cfg))], ['Costo fijo por hora', S(costoFijoHora(cfg))], ['Costo variable por km', 'S/ ' + costoPorKm(cfg).toFixed(4)]]
    .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
}

// ---------- Respaldo ----------
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
$('btnExport').onclick = () => download('traslados-respaldo.json', JSON.stringify({ cfg, hist }, null, 2), 'application/json');
$('btnImport').onchange = async e => {
  try { const d = JSON.parse(await e.target.files[0].text()); cfg = Object.assign(clone(DEFAULTS), d.cfg); hist = d.hist || [];
    save(); localStorage.setItem(KEY_HIST, JSON.stringify(hist)); init(); alert('Respaldo importado.'); } catch { alert('El archivo no es un respaldo válido.'); }
};
$('btnReset').onclick = () => { if (confirm('¿Restaurar todos los parámetros a los valores del Excel?')) { cfg = clone(DEFAULTS); save(); init(); } };

// ---------- Historial ----------
$('btnGuardar').onclick = () => {
  if (!last || !last.r.precio) return msg('Calcula un viaje antes de guardarlo.', true);
  hist.unshift({ fecha: new Date().toLocaleString('es-PE'), desc: $('desc').value, origen: $('origen').value, destino: $('destino').value,
    km: last.r.km, horas: +last.r.horas.toFixed(2), peaje: +last.t.peaje || 0, otros: (+last.t.cochera || 0) + (+last.t.otros || 0), precio: last.r.precio });
  localStorage.setItem(KEY_HIST, JSON.stringify(hist)); msg('Viaje guardado en el historial.');
};
function renderHist() {
  $('vacio').hidden = hist.length > 0; $('btnCsv').hidden = $('btnLimpiar').hidden = !hist.length;
  $('tabHist').innerHTML = hist.length ? '<tr><th>Fecha</th><th>Descripción</th><th>Origen</th><th>Destino</th><th>Km</th><th>Horas</th><th>Precio</th></tr>' +
    hist.map(h => `<tr><td>${h.fecha}</td><td>${esc(h.desc)}</td><td>${esc(h.origen)}</td><td>${esc(h.destino)}</td><td>${h.km.toFixed(1)}</td><td>${h.horas}</td><td>${S(h.precio)}</td></tr>`).join('') : '';
}
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('btnCsv').onclick = () => download('historial-traslados.csv', '\ufeff' + ['fecha,descripcion,origen,destino,km,horas,peaje,cochera_otros,precio',
  ...hist.map(h => [h.fecha, h.desc, h.origen, h.destino, h.km, h.horas, h.peaje, h.otros, h.precio].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'), 'text/csv');
$('btnLimpiar').onclick = () => { if (confirm('¿Borrar todo el historial?')) { hist = []; localStorage.setItem(KEY_HIST, '[]'); renderHist(); } };

function init() { $('unidad').value = cfg.unidadTiempo || 'min'; $('minutos').step = $('unidad').value === 'h' ? '0.01' : '1'; fillForm(); renderVars(); resumen(); recalc(); }
init();
