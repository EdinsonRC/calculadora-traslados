// Servicios de mapas: OpenRouteService (gratis) y Google Maps. Sin acceso a la pantalla, así se puede probar.
const GEO = (() => {
  const ORS = 'https://api.openrouteservice.org';
  const LIMA = { lat: -12.0464, lon: -77.0428 };
  const fail = async (res) => { let j = {}; try { j = await res.json(); } catch {} const e = j.error; throw new Error((e && e.message) || (typeof e === 'string' ? e : '') || 'HTTP ' + res.status); };

  // Qué tan exacta es una dirección encontrada por OpenRouteService (Pelias)
  function clasificar(p) {
    const casa = p.layer === 'address' || p.layer === 'venue';
    if (casa && p.match_type === 'exact') return { nivel: 'ok', texto: 'Dirección exacta' };
    if (casa) return { nivel: 'aprox', texto: 'Dirección aproximada: el número se estimó sobre la calle' };
    return { nivel: 'zona', texto: 'Solo se encontró la calle o la zona, no el número exacto' };
  }

  async function orsBuscar(texto, key, f, auto) {
    const q = new URLSearchParams({ api_key: key, text: texto, size: 5, 'boundary.country': 'PE', 'focus.point.lat': LIMA.lat, 'focus.point.lon': LIMA.lon });
    const res = await f(`${ORS}/geocode/${auto ? 'autocomplete' : 'search'}?${q}`);
    if (!res.ok) await fail(res);
    const j = await res.json();
    return (j.features || []).map(x => ({ label: x.properties.label, lat: x.geometry.coordinates[1], lon: x.geometry.coordinates[0], ...clasificar(x.properties) }));
  }

  async function orsRuta(a, b, key, f) {
    const res = await f(`${ORS}/v2/directions/driving-car`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: key },
      body: JSON.stringify({ coordinates: [[a.lon, a.lat], [b.lon, b.lat]] }),
    });
    if (!res.ok) await fail(res);
    const j = await res.json(); const s = j.routes && j.routes[0] && j.routes[0].summary;
    if (!s) throw new Error('No se encontró una ruta entre esos puntos.');
    return { km: s.distance / 1000, min: s.duration / 60 };
  }

  async function googleBuscar(texto, key, f) {
    const res = await f('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({ input: texto, includedRegionCodes: ['pe'], languageCode: 'es',
        locationBias: { circle: { center: { latitude: LIMA.lat, longitude: LIMA.lon }, radius: 50000 } } }),
    });
    if (!res.ok) await fail(res);
    const j = await res.json();
    return (j.suggestions || []).filter(s => s.placePrediction).map(s => ({ label: s.placePrediction.text.text, nivel: 'sugerida', texto: 'Sugerencia de Google Maps' }));
  }

  const lugar = p => typeof p === 'string' ? { address: p } : { location: { latLng: { latitude: p.lat, longitude: p.lon } } };

  async function orsReverse(lat, lon, key, f) {
    const res = await f(`${ORS}/geocode/reverse?` + new URLSearchParams({ api_key: key, 'point.lat': lat, 'point.lon': lon, size: 1 }));
    if (!res.ok) await fail(res);
    const j = await res.json(); return j.features && j.features[0] ? j.features[0].properties.label : null;
  }

  async function googleRuta(o, d, key, f) {
    const res = await f('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' },
      body: JSON.stringify({ origin: lugar(o), destination: lugar(d), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', regionCode: 'PE', languageCode: 'es-PE', units: 'METRIC' }),
    });
    if (!res.ok) await fail(res);
    const j = await res.json();
    if (!j.routes || !j.routes.length) throw new Error('No se encontró una ruta entre esas direcciones.');
    return { km: j.routes[0].distanceMeters / 1000, min: parseInt(j.routes[0].duration) / 60 };
  }

  return { clasificar, orsBuscar, orsRuta, orsReverse, googleBuscar, googleRuta };
})();
if (typeof module !== 'undefined') module.exports = GEO;
