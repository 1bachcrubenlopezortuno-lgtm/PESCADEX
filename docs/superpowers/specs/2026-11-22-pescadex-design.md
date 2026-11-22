# Pescadex — Diseño

Fecha: 2026-11-22 · Estado: pendiente de aprobación final

## 1. Intención y por qué

Un grupo de amigos de Andalucía se ha aficionado a la pesca (mar y río). Quieren una
"Pokédex de pesca": registrar sus capturas y salidas, ir desbloqueando las especies que
pescan, subir de nivel y piquearse entre ellos. Es una app privada para el grupo, no un
producto público. El éxito es que la usen de verdad cada vez que salen a pescar y que les
haga gracia comparar Pescadex, niveles y récords.

## 2. Objetivos

- Catálogo (Pescadex) de ~75 especies de Andalucía, mar y agua dulce, con rareza. Las no
  capturadas se ven como silueta; se desbloquean con la primera captura válida.
- Especies protegidas visibles con candado, con ficha informativa, **no capturables** y
  **no cuentan** para el % de completado.
- Registrar **jornadas** (cuaderno de pesca), aunque no se pesque nada.
- Registrar **capturas** dentro de una jornada: especie, fotos, ubicación, fecha/hora,
  peso, medida, cebo/señuelo, nota.
- **Social**: cada uno tiene su cuenta; todos ven las jornadas y capturas de los demás.
- **Privacidad de ubicación**: los demás ven ubicación aproximada por defecto; el autor
  puede elegir compartir el punto exacto en cada captura/jornada.
- **Perfil con progresión**: XP, niveles con título, medallas, récords personales,
  % de Pescadex.
- **Condiciones automáticas** en cada jornada: tiempo, viento, marea (en mar) y fase lunar.
- Funcionar en iPhone y Android **sin tiendas de apps ni coste** (PWA instalable).

## 3. No-objetivos

- Publicarla en App Store / Google Play.
- Reconocimiento automático de especies por foto (posible ampliación futura, no ahora).
- Usuarios fuera del grupo, rankings públicos, monetización.
- Cubrir especies fuera de Andalucía.

## 4. Anti-objetivos (fracaso aunque "funcione")

- Que se pueda ver el punto exacto de un pesquero de otro sin que este lo haya decidido.
  La ubicación exacta **no debe llegar nunca** al móvil de otro usuario (no basta con
  ocultarla en la interfaz).
- Que registrar una captura en la orilla sea lento o falle sin cobertura y se pierda.
- Que se pueda subir de nivel o desbloquear especies sin foto.
- Que anime a pescar especies protegidas.

## 5. Restricciones

- PWA: debe instalarse en la pantalla de inicio en iOS (Safari) y Android (Chrome).
- Coste cero: capa gratuita de Supabase y hosting estático gratuito.
- Uso con mala cobertura (escolleras, embalses): la app debe permitir crear jornadas y
  capturas sin conexión y sincronizar después.
- Fotos de móvil pesan mucho: comprimir en el cliente antes de subir.
- Grupo pequeño (~5–15 personas).
- Idioma de la app: español.

## 6. Enfoques considerados

| Enfoque | Ventajas | Inconvenientes |
|---|---|---|
| App nativa React Native (Expo) + Supabase | Mejor cámara/GPS, offline robusto, sensación de app | iPhone requiere cuenta Apple Developer (99 €/año) y TestFlight |
| **PWA + Supabase (elegido)** | Gratis, un enlace, sin tiendas, iOS y Android | Offline y cámara más limitados en iOS; menos "nativo" |
| Flutter + Firebase | Equivalente al primero | No aporta nada sobre él aquí; descartado |

**Elegido: PWA + Supabase** (decisión del usuario), para evitar el coste de Apple.

## 7. Lo decidido con el usuario

- Mar y río, especies de Andalucía (ver `docs/especies-andalucia.md`).
- Protegidas: visibles con candado, ficha informativa, no capturables, fuera del %.
- Social: todos ven a todos.
- Ubicación: aproximada por defecto; opción por captura de compartir punto exacto.
- Perfil con niveles, XP y "subidas de nivel".
- Cuaderno de jornadas aunque no se pesque nada.
- Foto **obligatoria** para que una captura dé XP y desbloquee especie. Sin foto se
  guarda como registro personal, sin XP ni desbloqueo.
- Tiempo, viento, marea y luna guardados automáticamente por jornada.
- Plataforma: PWA.
- **Clasificación** dentro del grupo: por nivel (XP), por % de Pescadex y récords por especie.
- **Jornadas compartidas**: uno crea la jornada y etiqueta a los compañeros; cada uno añade
  sus propias capturas a esa jornada y todos reciben el XP de jornada.
- **Especies reguladas** (mero, atún rojo, trucha común, besugo…): categoría "Regulada ⚠️";
  se pueden capturar y dan XP normal, pero al elegirlas se muestra aviso con la normativa.

## 8. Diseño propuesto

### 8.1 Pila técnica (decisión del asistente)

- Frontend: React + TypeScript + Vite, `vite-plugin-pwa` (service worker, manifest).
- Datos locales/offline: IndexedDB (p. ej. Dexie) como cola de cambios pendientes y caché.
- Backend: Supabase (Postgres + Auth + Storage), con Row Level Security.
- Mapas: Leaflet + teselas de OpenStreetMap.
- Condiciones: Open-Meteo (tiempo/viento y API marina); fase lunar calculada en el cliente.
- Hosting: estático gratuito (GitHub Pages, Netlify o Cloudflare Pages).

### 8.2 Modelo de datos

- **profiles**: id (= auth user), nombre, avatar, fecha de alta.
- **species** (catálogo, datos semilla): id, nombre común, nombre científico, medio
  (mar/dulce), familia/grupo, rareza (común, poco común, rara, épica, legendaria),
  estado legal (libre / regulada / protegida), texto de normativa, descripción, notas (normativa, peligros), imagen/silueta.
- **outings** (jornadas): id, usuario, inicio, fin, modalidad (surfcasting, spinning,
  barco, embalse, río, otra), acompañantes etiquetados (lista de usuarios), nota, ubicación,
  condiciones (JSON: temperatura, viento, nubosidad, estado del mar, marea, fase lunar).
- **catches** (capturas): id, jornada (propia o en la que el usuario está etiquetado), usuario, especie, fecha/hora, peso (g, opcional),
  medida (cm, opcional), cebo/señuelo (opcional), nota, ubicación, compartir exacta (bool),
  fotos (1..n).
- **Ubicación en dos niveles**: el punto exacto se guarda en una tabla/columnas que solo el
  autor puede leer (RLS). Al guardar, un trigger calcula la ubicación aproximada (celda de
  ~5 km y/o nombre de zona, p. ej. "Costa de Conil") en columnas legibles por todos. Si el
  autor marca "compartir exacta", las RLS permiten a los demás leer el punto exacto.
- **Fotos**: Supabase Storage; comprimidas en el cliente (~1600 px lado largo, JPEG/WebP).
  Eliminar metadatos EXIF de GPS antes de subir (si no, filtran la ubicación exacta).

### 8.3 Reglas de juego

- **Captura válida** = tiene al menos una foto y la especie no está protegida
  (las reguladas sí cuentan).
- **Desbloqueo**: una especie queda desbloqueada para un usuario con su primera captura
  válida de ella.
- **% Pescadex** = especies desbloqueadas / especies no protegidas.
- **XP**:
  - Captura válida: común 10 · poco común 25 · rara 50 · épica 100 · legendaria 250.
  - Primera captura de una especie: ×3.
  - Récord personal (supera su mayor peso o medida de esa especie): +50% de la base.
  - Jornada: +5 XP al creador y a cada compañero etiquetado (aunque sea en blanco).
    Las medallas de jornadas (en blanco, madrugador) cuentan también para los etiquetados;
    "en blanco" = ese usuario no tuvo capturas en la jornada.
- **Niveles**: curva creciente (p. ej. XP para nivel n ≈ 100·n^1.5). Títulos por tramos:
  Grumete → Pescador de espigón → Caña fina → Lobo de mar → Señor del Estrecho → Leyenda.
- **Medallas** (lista inicial, ampliable): primera captura, primera especie de cada rareza,
  completar un grupo (p. ej. todos los sargos), mar y río el mismo fin de semana,
  10 jornadas en blanco, madrugador (5 jornadas empezadas antes del amanecer),
  10/50/100 capturas, primera legendaria.
- XP, nivel, medallas y récords se **calculan a partir de los datos** (no se guardan como
  contadores editables), para que sean siempre coherentes.
- Animación/aviso de "¡Subida de nivel!" y "¡Nueva especie!" al guardar.

### 8.4 Pantallas

1. **Pescadex**: rejilla de especies; filtros mar/dulce, rareza, capturadas/no. Silueta si no
   capturada, candado si protegida. Ficha: info, rareza, normativa, mis capturas y récord,
   y quién del grupo la tiene. Las reguladas muestran ⚠️ y su normativa.
2. **Registrar**: botón grande siempre visible. Flujo rápido: foto → especie (buscador) →
   datos opcionales → guardar. Ubicación por GPS automáticamente. Se asocia a la jornada
   en curso o crea una.
3. **Cuaderno**: lista de jornadas (mías / del grupo), detalle con capturas y condiciones.
   "Empezar jornada" / "Terminar jornada", etiquetar compañeros. Un compañero etiquetado
   ve la jornada como suya y puede añadir capturas (también sin conexión, una vez la ha
   recibido en su móvil).
4. **Mapa**: mis capturas en punto exacto; las de los demás en zona aproximada (o exacta si
   la compartieron).
5. **Grupo / feed**: últimas capturas y jornadas de los amigos.
6. **Clasificación**: ranking del grupo por nivel/XP y por % de Pescadex, y tabla de
   récords del grupo por especie (mayor peso y mayor medida, con quién y cuándo).
7. **Perfil** (propio y de los demás): avatar, nivel, barra de XP, título, % Pescadex,
   medallas, récords, últimas capturas.

### 8.5 Cuentas y grupo

- Un único grupo privado. Registro solo con código de invitación.
- Inicio de sesión con email + código de un solo uso (OTP) o contraseña. Evitar enlaces
  mágicos: en iOS abren Safari y no la PWA instalada.

### 8.6 Offline

- Crear/editar jornadas y capturas (con fotos) funciona sin conexión; se guardan en
  IndexedDB y se sincronizan al recuperar conexión, con indicador "pendiente de subir".
- El catálogo de especies y sus imágenes se cachean en el primer uso.
- Las condiciones meteorológicas se rellenan al sincronizar si se creó sin conexión
  (Open-Meteo permite consultar horas pasadas).

### 8.7 Decisiones del asistente tras la revisión (corregibles)

- **Una entrada por especie real.** Las filas que agrupan varias especies se separan
  (p. ej. carpín, doncella / fredi), salvo cuando en la práctica no se distinguen:
  las lisas/mújoles se agrupan en una sola entrada "Lisas". Los endemismos protegidos
  pequeños (jarabugo, calandino, colmilleja) van como entradas separadas con candado.
- **Medio**: una especie puede ser de mar, de agua dulce o de ambos (lista de valores);
  la lisa es de ambos.
- **Rareza fija por especie.** Los "ejemplares grandes" no cambian la rareza; ya los premia
  el bonus de récord personal.
- **El catálogo es provisional**: se carga desde un archivo semilla fácil de editar, para
  ajustarlo cuando el grupo lo revise.
- **Capturas sin foto**: visibles para el grupo, marcadas "sin foto · no puntúa". Si se
  añade foto después, pasa a ser válida y da XP en ese momento (incluido el desbloqueo).
- **Especies protegidas**: no se pueden elegir al registrar. La ficha dice "si la pescas
  por accidente, suéltala".

## 9. Lo que queda a criterio de quien lo construya

- Librerías concretas (estado, UI, Dexie u otra), estructura de carpetas, estilos.
- Imágenes de las especies: fuentes con licencia libre (p. ej. Wikimedia Commons, con
  atribución) o ilustraciones/siluetas propias; no usar imágenes con copyright.
- Tamaño exacto de la celda de ubicación aproximada y método de nombre de zona.
- Curva exacta de niveles y valores finos de XP (se pueden ajustar tras probar).
- Comprobar qué datos de marea ofrece Open-Meteo para costa andaluza; si no son fiables,
  guardar solo tiempo, viento, oleaje y luna y dejar la marea para más adelante.
- Proceso para crear el proyecto de Supabase (lo tendrá que crear el usuario con su cuenta;
  documentar los pasos).
