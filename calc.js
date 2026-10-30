// Motor de cálculo: replica la hoja CALCULO del Excel. Sin dependencias de pantalla.
const DEFAULTS = { // Valores de ejemplo. Los reales se cargan en Parámetros o con "Importar respaldo".
  sueldo: 1500, carga: 0.5, horasMes: 168,
  galonPrecio: 15, galonSem: 3, semMes: 4, lavado: 20, lavadoSem: 1,
  glp: 5, rend: 40,
  unidadTiempo: 'min', igv: 0.18, margen: 0.1, peaje: 0, cochera: 0, minExtra: 0,
  variables: [ // costo = S/ por cada "km" recorridos; f = factor; on = entra al cálculo
    { n: 'Mantenimiento (5 000 km)', km: 5000, costo: 0, f: 1, on: true },
    { n: 'Mantenimiento (70 000 km)', km: 70000, costo: 0, f: 1, on: true },
    { n: 'Cambio de llantas', km: 110000, costo: 0, f: 1, on: true },
    { n: 'Baterías', km: 110000, costo: 0, f: 1, on: false },
    { n: 'Cambio de aceite', km: 80000, costo: 0, f: 0.7, on: false },
    { n: 'Pastillas de freno y zapatas', km: 80000, costo: 0, f: 0.7, on: false },
    { n: 'Refrigerante', km: 50000, costo: 0, f: 0.7, on: false },
    { n: 'Bujías', km: 10000, costo: 0, f: 0.7, on: false },
    { n: 'Alineamiento y balanceo', km: 20000, costo: 0, f: 0.7, on: false },
  ],
};

const num = v => (isFinite(+v) ? +v : 0);

function costoFijoMensual(c) {
  return num(c.sueldo) * (1 + num(c.carga))
    + num(c.galonPrecio) * num(c.galonSem) * num(c.semMes)
    + num(c.lavado) * num(c.lavadoSem) * num(c.semMes);
}
const costoFijoHora = c => costoFijoMensual(c) / (num(c.horasMes) || 1);

function costoPorKm(c) {
  const comb = num(c.glp) / (num(c.rend) || 1);
  const resto = c.variables.filter(v => v.on)
    .reduce((s, v) => s + num(v.costo) * num(v.f) / (num(v.km) || 1), 0);
  return comb + resto;
}

// t = { km, minutos, peaje, cochera, otros, idaVuelta }
function calcular(c, t) {
  const mult = t.idaVuelta ? 2 : 1;
  const km = num(t.km) * mult;
  const horas = ((num(t.minutos) * mult) + num(c.minExtra)) / 60;
  const fijo = horas * costoFijoHora(c);
  const variable = km * costoPorKm(c);
  const extras = num(t.peaje) + num(t.cochera) + num(t.otros);
  const costo = fijo + variable + extras;
  const conIgv = Math.round(costo * (1 + num(c.igv)) * 100) / 100;
  const precio = conIgv * (1 + num(c.margen));
  return { km, horas, fijo, variable, extras, costo, conIgv, precio: Math.round(precio * 100) / 100 };
}

if (typeof module !== 'undefined') module.exports = { DEFAULTS, costoFijoMensual, costoFijoHora, costoPorKm, calcular };
