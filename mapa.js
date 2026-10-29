// Ventana con mapa para elegir un punto: Google Maps (si el proveedor es Google) o OpenStreetMap/Leaflet (gratis).
const MAPA = (() => {
  const LIMA = { lat: -12.0464, lon: -77.0428 };
  const $m = id => document.getElementById(id);
  let map, marker, cur, cfg;
  const script = (src, onerror) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error(onerror)); document.head.append(s); });

  async function cargarGoogle(key) {
    if (window.google && google.maps && google.maps.Map) return;
    window.gm_authFailure = () => { $m('mInfo').textContent = 'Google rechazó la clave. Revisa que Maps JavaScript API esté habilitada, la facturación y la restricción de sitio web.'; };
    await new Promise((ok, ko) => { window.__gm = ok; const s = document.createElement('script'); s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&callback=__gm&language=es&region=PE'; s.onerror = () => ko(new Error('No se pudo cargar Google Maps. Revisa tu conexión.')); document.head.append(s); });
  }
  async function cargarLeaflet() {
    if (window.L) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'; document.head.append(l);
    await script('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', 'No se pudo cargar el mapa. Revisa tu conexión.');
  }
  const geocoderGoogle = req => new Promise(ok => new google.maps.Geocoder().geocode(req, (r, st) => ok(st === 'OK' && r[0] ? r[0] : null)));

  async function poner(lat, lon) {
    if (cfg.motor === 'google') { marker.setPosition({ lat, lng: lon }); marker.setVisible(true); } else marker.setLatLng([lat, lon]).addTo(map);
    cur = { lat, lon, label: `Punto en el mapa (${lat.toFixed(5)}, ${lon.toFixed(5)})`, nivel: 'ok', texto: 'Punto elegido en el mapa' };
    $m('mLabel').textContent = cur.label; $m('mOk').disabled = false;
    const mio = cur;
    try { // intenta poner el nombre de la calle
      const nombre = cfg.motor === 'google' ? (await geocoderGoogle({ location: { lat, lng: lon } }) || {}).formatted_address : await cfg.reverse(lat, lon);
      if (nombre && cur === mio) { cur.label = nombre; $m('mLabel').textContent = nombre; }
    } catch { /* se queda con las coordenadas */ }
  }

  // cfg: { motor:'google'|'osm', key, titulo, punto, texto, info, reverse(lat,lon), onOk(punto) }
  async function abrir(c) {
    if (map && typeof map.remove === 'function') map.remove(); // Leaflet: libera el recuadro antes de crear otro mapa
    map = marker = null;
    cfg = c; cur = null; $m('mOk').disabled = true; $m('mLabel').textContent = '';
    $m('mTitulo').textContent = c.titulo; $m('mInfo').textContent = c.info; $m('mapa').innerHTML = '';
    $m('dlgMapa').showModal();
    try {
      let centro = c.punto, zoom = 17;
      if (c.motor === 'google') {
        await cargarGoogle(c.key);
        if (!centro && c.texto) { const g = await geocoderGoogle({ address: c.texto, region: 'PE' }); if (g) centro = { lat: g.geometry.location.lat(), lon: g.geometry.location.lng() }; }
        if (!centro) { centro = LIMA; zoom = 12; }
        map = new google.maps.Map($m('mapa'), { center: { lat: centro.lat, lng: centro.lon }, zoom, streetViewControl: false, mapTypeControl: false });
        marker = new google.maps.Marker({ map, draggable: true, visible: false });
        map.addListener('click', e => poner(e.latLng.lat(), e.latLng.lng()));
        marker.addListener('dragend', () => { const p = marker.getPosition(); poner(p.lat(), p.lng()); });
      } else {
        await cargarLeaflet();
        if (!centro) { centro = LIMA; zoom = 12; }
        map = L.map($m('mapa')).setView([centro.lat, centro.lon], zoom);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
        marker = L.marker([centro.lat, centro.lon], { draggable: true });
        map.on('click', e => poner(e.latlng.lat, e.latlng.lng));
        marker.on('dragend', () => { const p = marker.getLatLng(); poner(p.lat, p.lng); });
      }
      if (c.punto) poner(c.punto.lat, c.punto.lon);
    } catch (e) { $m('mInfo').textContent = 'Error de mapas: ' + e.message; }
  }
  $m('mCerrar').onclick = () => $m('dlgMapa').close();
  $m('mOk').onclick = () => { if (cur) { $m('dlgMapa').close(); cfg.onOk(cur); } };
  return { abrir };
})();
