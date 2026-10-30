# Calculadora de traslados

Aplicación web de uso interno que calcula el precio de un traslado con las fórmulas de una hoja de cálculo de precios. Ingresas origen y destino, Google Maps calcula distancia y tiempo, y la app te da el precio. Todos los parámetros se editan desde la pestaña **Parámetros**.

No necesita instalar nada ni base de datos: son archivos estáticos y los datos se guardan en tu navegador (`localStorage`).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de las 3 pestañas |
| `style.css` | Diseño (claro y oscuro automático) |
| `calc.js` | **Fórmulas del Excel.** No toca la pantalla |
| `geo.js` | Conexión con OpenRouteService y Google Maps (rutas, búsqueda y verificación de direcciones) |
| `mapa.js` | Ventana con mapa para elegir un punto (Google Maps u OpenStreetMap) |
| `app.js` | Pantalla, guardado, historial, respaldo |
| `manifest.json`, `icon-*.png` | Permiten instalarla como app en el celular |

## Cómo usarla

1. Abre una terminal en la carpeta y ejecuta: `python -m http.server 8000`
2. Entra a <http://localhost:8000> en el navegador.
3. En **Parámetros → Servicio de mapas** elige el proveedor y pega su API key (ver secciones siguientes).

No abras `index.html` con doble clic: Google rechaza las llamadas desde `file://`. Alternativa: extensión *Live Server* de VS Code.

## Proveedores de mapas

En **Parámetros → Servicio de mapas** puedes alternar entre dos proveedores. Cada uno guarda su propia clave.

### OpenRouteService (gratis, recomendado para empezar)

1. Regístrate en <https://openrouteservice.org> con tu correo.
2. En tu panel (*Dashboard*) crea un token tipo **Standard** y cópialo.
3. Pégalo en *API key de OpenRouteService* y deja el proveedor en OpenRouteService.

El plan gratuito tiene límites diarios (al revisarlo: 2 000 rutas y 1 000 búsquedas de direcciones al día; confirma los vigentes en su página de planes). Revisa también sus condiciones sobre uso comercial.
Limitaciones: el tiempo **no incluye tráfico en tiempo real** (usa *Minutos extra por viaje* para compensar) y algunas direcciones de Lima pueden estar incompletas.

### Google Maps (requiere tarjeta para activar facturación)

1. En <https://console.cloud.google.com> crea un proyecto y vincula una cuenta de facturación.
2. En *APIs y servicios → Biblioteca* habilita **Routes API**, **Places API (New)**, **Maps JavaScript API** (para el mapa) y **Geocoding API** (para centrar el mapa en lo escrito y mostrar el nombre de la calle).
3. En *Credenciales* crea una clave de API y restríngela a esas cuatro APIs (y a `http://localhost:8000/*` si funciona con tu configuración).
4. Pégala en *API key de Google Maps*.

Crea una alerta de presupuesto en *Facturación* para evitar cobros inesperados.

## Verificar y corregir una dirección en el mapa

Bajo Origen y Destino hay un botón **Verificar dirección**. Al pulsarlo se abre una ventana con un mapa:

1. El mapa se centra en la dirección escrita. Con OpenRouteService, arriba se indica qué tan exacta es: *exacta*, *aproximada* (el número se estimó) o *solo calle o zona*.
2. Si no es el lugar correcto, **haz clic en el mapa** o **arrastra el marcador** al punto exacto. Se muestra el nombre de la calle de ese punto.
3. Pulsa **Confirmar este punto y calcular**. Ese punto reemplaza la dirección escrita.
4. Si ya están definidos origen y destino, la app trae **km y minutos** automáticamente y calcula el precio. Si falta uno, te avisa.

Con proveedor Google el mapa es de Google Maps y los km y el tiempo salen de Google (con tráfico). Con OpenRouteService el mapa es de OpenStreetMap y es gratis. Si calculas la ruta sin pasar por el mapa, con OpenRouteService la app toma la primera coincidencia y te avisa si no era exacta. Tip: agrega el distrito ("Av. Larco 345, Miraflores").

Nota: Google no permite abrir su página web y recibir de vuelta el punto elegido, por eso el mapa va dentro de la aplicación.

## Fórmulas (idénticas al Excel)

```
Costo fijo mensual = Remuneración × (1 + carga social)
                   + Gasolina fija (precio galón × galones/sem × sem/mes)
                   + Lavado (costo × lavados/sem × sem/mes)
Costo fijo por hora = Costo fijo mensual ÷ horas al mes      

Costo por km = Precio GLP ÷ rendimiento
             + Σ (costo × factor ÷ km) de cada concepto marcado

Costo del viaje = horas × costo fijo por hora + km × costo por km + peajes + cochera + otros
Precio = redondear(costo × (1 + IGV), 2) × (1 + margen)
```

## Cómo se calcula cada dato del viaje

- **Unidad del tiempo:** junto al campo *Tiempo* eliges **minutos** u **horas** (el Excel usa horas). Al cambiarla, el valor escrito se convierte solo, y la calculadora recuerda tu elección. El desglose muestra siempre el tiempo cobrado en horas y minutos.
- **Distancia y tiempo:** los trae el proveedor elegido (Google considera el tráfico actual; OpenRouteService no). Puedes corregirlos a mano antes de calcular.
- **Minutos extra por viaje** (Parámetros): suma espera o gestión al tiempo de Google (en el Excel los tiempos eran estimados manuales).
- **Ida y vuelta:** duplica km y tiempo. Por defecto va desactivado, porque tus consideraciones indican que no se cobra el retorno a oficina.
- **Peajes:** se ingresan a mano (los proveedores no informan peajes de Lima). Cochera y estacionamiento igual.

## Pestañas

- **Calculadora:** origen, destino, extras y precio con desglose. El botón *Guardar en historial* registra el viaje.
- **Parámetros:** sueldo, carga social, horas al mes, gasolina, lavado, GLP, rendimiento, IGV, margen, valores por defecto, y la tabla de costos variables (agregar, quitar, marcar/desmarcar). Abajo ves el costo fijo por hora y por km actualizados. También exporta, importa o restaura los valores del Excel.
- **Historial:** lista de viajes guardados y descarga a CSV (abre en Excel).

## Datos y respaldo

Todo se guarda en el navegador (no en el sitio web) y computadora donde lo uses. Si borras los datos del navegador, se pierden: usa **Exportar respaldo** de vez en cuando. Para pasar tus datos a otra PC, exporta en una e importa en la otra. Las API keys no entran en el respaldo.

## Notas de cálculo

- Los costos variables marcados por defecto son GLP, mantenimiento 5 000 km, mantenimiento 70 000 km y llantas. El resto queda sin marcar (puedes marcarlo en Parámetros).
- La app suma siempre la cochera y redondea el precio final a 2 decimales.
- Los valores iniciales son de ejemplo; carga los reales en Parámetros o con *Importar respaldo*.

## Siguientes pasos posibles

Mapa de la ruta en pantalla, paradas intermedias, tarifas guardadas por cliente, usuarios y base de datos compartida (por ejemplo con un servidor Node y SQLite), y esconder la API key en un servidor cuando se publique.

## Publicar en GitHub Pages (desde la web de GitHub)

1. Crea un repositorio **Public** llamado `calculadora-traslados` en github.com (*New repository*).
2. En el repositorio: *Add file → Upload files*, arrastra **los archivos** de la carpeta (que `index.html` quede en la raíz) y pulsa *Commit changes*.
3. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, Branch **main**, carpeta **/(root)**, *Save*.
4. En 1 o 2 minutos aparece la dirección `https://TU-USUARIO.github.io/calculadora-traslados/`.
5. Si usas Google Maps, agrega `https://TU-USUARIO.github.io/*` a las restricciones de sitio web de tu clave.

No subas a GitHub ningún archivo de respaldo con tus datos ni escribas claves dentro del código.
