# Pescadex — Fase 1 (versión usable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una PWA instalable donde los amigos se registran con código de invitación, crean jornadas, registran capturas con foto y ubicación, desbloquean la Pescadex y ven su perfil con XP y nivel.

**Architecture:** SPA React + TypeScript (Vite) servida como PWA estática. Supabase aporta Auth (email + código OTP), Postgres con Row Level Security (la ubicación exacta vive en tablas aparte que solo puede leer el autor salvo que la comparta) y Storage para fotos. El catálogo de especies es un JSON del repo, que se usa en el cliente y genera el SQL de semilla. XP, niveles y desbloqueos se calculan en el cliente con funciones puras a partir de los datos.

**Tech Stack:** Vite 5, React 18, TypeScript, React Router 6, @supabase/supabase-js 2, vite-plugin-pwa, browser-image-compression, Vitest (+ Testing Library, + modo navegador con Playwright), Supabase CLI (pgTAP para tests de base de datos).

**Spec:** `docs/superpowers/specs/2026-11-22-pescadex-design.md` (catálogo base en `docs/especies-andalucia.md`).

### Fases del proyecto (cada una tendrá su propio plan)

1. **Este plan** — cuentas, catálogo, jornadas, capturas con foto, Pescadex, perfil con XP/nivel.
2. Offline (IndexedDB + sincronización), condiciones (Open-Meteo + luna), mapa, sitios recomendados y zonas visitadas, nombre de zona aproximada.
3. Social: feed del grupo, reacciones, comentarios, notificaciones push, clasificación, medallas, récords del grupo, carta compartible, tallas mínimas + captura y suelta.
4. Estadísticas.

## Global Constraints

- Todo el texto de la interfaz en español.
- La ubicación exacta de otro usuario **nunca** llega al cliente salvo que `share_exact = true` (garantizado por RLS, no por la UI).
- Captura válida = al menos una foto **y** especie no `protegida`. Solo las válidas dan XP y desbloquean.
- Especies `protegida`: no se pueden registrar (bloqueo en UI **y** en base de datos). Cuentan fuera del % de Pescadex.
- XP base por rareza: común 10 · poco común 25 · rara 50 · épica 100 · legendaria 250. Primera captura de una especie ×3. Récord personal +50% de la base. Jornada +5 XP al creador y a cada compañero etiquetado.
- Fotos comprimidas a 1600 px de lado largo, JPEG, sin metadatos EXIF.
- Coste cero: capa gratuita de Supabase, hosting estático (Netlify).
- Debe funcionar instalada en iOS Safari 16.4+ y Android Chrome.
- Sin enlaces mágicos: inicio de sesión con código OTP de 6 dígitos.

## Review Focus

1. **GPS denegado o sin señal** → la captura se guarda igual, sin ubicación, con aviso "Sin ubicación". (Test en Task 9.)
2. **Foto con GPS en EXIF** (lo normal en móvil) → la foto subida no lleva coordenadas. (Test en Task 5.)
3. **Foto enorme** (12 MP, >5 MB) → se sube comprimida por debajo de 1 MB. (Test en Task 5.)
4. **Doble toque en "Guardar"** → una sola captura (id generado en cliente + `on conflict do nothing`, botón deshabilitado mientras guarda). (Tests en Task 4 y Task 9.)
5. **Falla la subida de la foto** tras crear la captura → la captura queda "Sin foto · no puntúa" y el autor puede añadir la foto después desde el detalle. (Test en Task 8.)

---

## Estructura de archivos

```
package.json, vite.config.ts, vitest.workspace.ts, tsconfig.json, index.html, netlify.toml
public/icons/                     iconos PWA (192, 512, maskable)
src/main.tsx, src/App.tsx         arranque y rutas
src/ui/TabBar.tsx                 barra inferior
src/catalog/species.json          catálogo (fuente única)
src/catalog/types.ts              tipos de especie
src/catalog/catalog.ts            carga tipada + índices
src/catalog/catalog.test.ts
src/game/xp.ts, levels.ts, pescadex.ts (+ .test.ts)
src/data/supabase.ts              cliente
src/data/types.ts                 tipos de filas
src/data/api.ts                   acceso a datos
src/data/photo.ts (+ photo.browser.test.ts)
src/auth/AuthProvider.tsx, LoginPage.tsx, JoinPage.tsx
src/pescadex/PescadexPage.tsx, SpeciesPage.tsx, SpeciesCard.tsx
src/outings/NotebookPage.tsx, OutingPage.tsx, useActiveOuting.ts
src/catches/RegisterPage.tsx, CatchPage.tsx, SpeciesPicker.tsx, useGeolocation.ts
src/profile/ProfilePage.tsx
scripts/gen-species-seed.ts       species.json → supabase/seed.sql
supabase/config.toml
supabase/migrations/20261122000000_init.sql
supabase/seed.sql                 generado
supabase/tests/*.test.sql         pgTAP
README.md
```

---

### Task 1: Esqueleto de la PWA

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.workspace.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/ui/TabBar.tsx`, `public/icons/*`, `netlify.toml`, `.gitignore`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: rutas `/` (Pescadex), `/especie/:id`, `/cuaderno`, `/jornada/:id`, `/registrar`, `/captura/:id`, `/perfil/:userId`, `/login`, `/unirse`. Componentes de página como placeholders que las tareas siguientes reemplazan. Scripts npm: `dev`, `build`, `test` (unit), `test:browser`, `test:db`, `gen:seed`.

- [ ] **Step 1:** `npm create vite@latest . -- --template react-ts`; instalar `react-router-dom@6 @supabase/supabase-js@2 browser-image-compression` y dev `vite-plugin-pwa vitest @vitest/browser playwright @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom supabase tsx`.
- [ ] **Step 2:** `vitest.workspace.ts` con dos proyectos: `unit` (jsdom, `src/**/*.test.ts(x)` excluyendo `*.browser.test.ts`) y `browser` (`src/**/*.browser.test.ts`, provider playwright, chromium; si la versión de Playwright del proyecto no encuentra navegador, `launch.executablePath: '/opt/pw-browsers/chromium'`).
- [ ] **Step 3: Test que falla** — `src/App.test.tsx`: renderiza `<App />` en `MemoryRouter` en `/` y espera enlaces de la barra con textos `Pescadex`, `Cuaderno`, `Registrar`, `Perfil`.
- [ ] **Step 4:** `npx vitest run --project unit` → FAIL.
- [ ] **Step 5:** Implementar `App` (rutas) y `TabBar`. `vite-plugin-pwa` con `registerType: 'autoUpdate'`, manifest `name: 'Pescadex'`, `short_name: 'Pescadex'`, `lang: 'es'`, `display: 'standalone'`, `theme_color: '#0b4f6c'`, iconos 192/512/maskable. `netlify.toml`: build `npm run build`, publish `dist`, redirect `/* /index.html 200`.
- [ ] **Step 6:** `npx vitest run --project unit` → PASS; `npm run build` → genera `dist/manifest.webmanifest` y `dist/sw.js`.
- [ ] **Step 7:** Commit `feat: esqueleto PWA con rutas y barra inferior`.

---

### Task 2: Catálogo de especies

**Files:**
- Create: `src/catalog/types.ts`, `src/catalog/species.json`, `src/catalog/catalog.ts`, `scripts/gen-species-seed.ts`
- Test: `src/catalog/catalog.test.ts`

**Interfaces:**
- Produces:
```ts
export type Rarity = 'comun' | 'poco_comun' | 'rara' | 'epica' | 'legendaria';
export type LegalStatus = 'libre' | 'regulada' | 'protegida';
export type Habitat = 'mar' | 'dulce';
export interface Species {
  id: string;              // slug: 'dorada', 'atun-rojo', 'lisas'
  commonName: string;
  scientificName: string;
  habitats: Habitat[];
  group: string;           // 'Espáridos', 'Pelágicos', 'Ciprínidos'…
  rarity: Rarity;
  legal: LegalStatus;
  legalNote?: string;      // obligatorio si legal !== 'libre'
  description: string;     // 1–3 frases estilo Pokédex
  bestMonths: number[];    // 1..12
  zones: string;           // dónde es más fácil en Andalucía
}
// catalog.ts
export const SPECIES: Species[];
export const SPECIES_BY_ID: Record<string, Species>;
export function capturable(s: Species): boolean; // legal !== 'protegida'
```
- `npm run gen:seed` escribe `supabase/seed.sql` con `insert into species (id, common_name, rarity, legal) values … on conflict (id) do update …`.

- [ ] **Step 1: Test que falla** — `catalog.test.ts`:
  - `SPECIES.length` entre 70 y 90; ids únicos y en formato `^[a-z0-9-]+$`.
  - Todo `rarity`, `legal`, `habitats` dentro de sus uniones; `habitats.length >= 1`; `bestMonths` no vacío y cada valor 1..12; `description` y `zones` no vacíos.
  - `legal !== 'libre'` ⇒ `legalNote` no vacío.
  - Protegidas: `anguila`, `sabalo`, `saboga`, `jarabugo`, `calandino`, `colmilleja` tienen `legal === 'protegida'`.
  - Reguladas: `mero`, `atun-rojo`, `trucha-comun`, `besugo` tienen `legal === 'regulada'`.
  - `SPECIES_BY_ID['lisas'].habitats` contiene `'mar'` y `'dulce'`.
- [ ] **Step 2:** `npx vitest run src/catalog` → FAIL.
- [ ] **Step 3:** Escribir `species.json` a partir de `docs/especies-andalucia.md` aplicando la sección 8.7 del spec: una entrada por especie real (carpín, doncella y fredi separados; lisas/mújoles juntos en `lisas`; jarabugo, calandino y colmilleja separados), rareza del documento sin variantes por tamaño, descripción con carácter estilo Pokédex, meses de mejor temporada y zonas. Implementar `catalog.ts` y el script.
- [ ] **Step 4:** `npx vitest run src/catalog` → PASS; `npm run gen:seed` genera `supabase/seed.sql`.
- [ ] **Step 5:** Commit `feat: catálogo de especies de Andalucía`.

---

### Task 3: Lógica de juego (XP, niveles, Pescadex)

**Files:**
- Create: `src/game/xp.ts`, `src/game/levels.ts`, `src/game/pescadex.ts`
- Test: `src/game/xp.test.ts`, `src/game/levels.test.ts`, `src/game/pescadex.test.ts`

**Interfaces:**
- Consumes: `Species`, `SPECIES_BY_ID` (Task 2).
- Produces:
```ts
// xp.ts
export interface GameCatch { id: string; speciesId: string; caughtAt: string; photoCount: number; weightG: number | null; lengthCm: number | null; }
export const RARITY_XP: Record<Rarity, number>; // 10, 25, 50, 100, 250
export function isValidCatch(c: GameCatch, byId?: Record<string, Species>): boolean;
export interface XpEvent { catchId: string; xp: number; firstOfSpecies: boolean; record: boolean; }
export function catchXpEvents(catches: GameCatch[], byId?: Record<string, Species>): XpEvent[]; // solo válidas, ordenadas por caughtAt
export function totalXp(catches: GameCatch[], outingCount: number, byId?: Record<string, Species>): number;
// levels.ts
export function xpForLevel(level: number): number;      // umbral acumulado: round(100 * (level-1)^1.5)
export interface LevelInfo { level: number; title: string; xpIntoLevel: number; xpForNext: number; }
export function levelInfo(xp: number): LevelInfo;
// pescadex.ts
export function unlockedSpeciesIds(catches: GameCatch[], byId?: Record<string, Species>): Set<string>;
export function pescadexProgress(unlocked: Set<string>, catalog?: Species[]): { unlocked: number; total: number; percent: number }; // total sin protegidas, percent entero redondeado
```
- Reglas de `catchXpEvents`: base = `RARITY_XP[rarity]`; primera válida de la especie → `base * 3` (sin bonus de récord); si no, `base`, y si `weightG` supera el máximo previo de esa especie o `lengthCm` supera la medida máxima previa (ignorando nulos) → `+ round(base * 0.5)`. `totalXp` = suma + `5 * outingCount`.
- Títulos: niveles 1–4 `Grumete`, 5–9 `Pescador de espigón`, 10–14 `Caña fina`, 15–24 `Lobo de mar`, 25–39 `Señor del Estrecho`, 40+ `Leyenda`.

- [ ] **Step 1: Tests que fallan:**
  - `isValidCatch`: con `photoCount 0` → false; especie `anguila` con foto → false; `dorada` con foto → true.
  - `catchXpEvents`: dos doradas (poco común) con foto → `[75, 25]`; tercera dorada más pesada que las anteriores → `25 + 13 = 38` con `record: true`; dorada sin foto no genera evento ni cuenta como primera (la siguiente con foto sí recibe ×3); récord por medida cuando el peso es null.
  - Orden: los eventos se calculan por `caughtAt` aunque el array llegue desordenado.
  - `totalXp([], 3) === 15`.
  - `xpForLevel(1) === 0`, `xpForLevel(2) === 100`, `xpForLevel(5) === 800`, `xpForLevel(10) === 2700`.
  - `levelInfo(0)` → nivel 1, `Grumete`, `xpForNext 100`; `levelInfo(800)` → nivel 5, `Pescador de espigón`; `levelInfo(799).level === 4`.
  - `pescadexProgress`: `total` = número de especies no protegidas del catálogo; con 0 desbloqueadas `percent 0`.
  - `unlockedSpeciesIds` ignora capturas sin foto.
- [ ] **Step 2:** `npx vitest run src/game` → FAIL.
- [ ] **Step 3:** Implementar los tres módulos.
- [ ] **Step 4:** `npx vitest run src/game` → PASS.
- [ ] **Step 5:** Commit `feat: reglas de XP, niveles y progreso de Pescadex`.

---

### Task 4: Base de datos (esquema, RLS, almacenamiento)

**Files:**
- Create: `supabase/config.toml` (`npx supabase init`), `supabase/migrations/20261122000000_init.sql`
- Test: `supabase/tests/membership.test.sql`, `supabase/tests/locations.test.sql`, `supabase/tests/catches.test.sql`

**Interfaces:**
- Produces (SQL, esquema `public`):
  - `app_config(id int pk check (id=1), invite_code text not null)` — sin políticas de lectura para clientes.
  - `species(id text pk, common_name text, rarity text, legal text check (legal in ('libre','regulada','protegida')))` — lectura para miembros.
  - `profiles(id uuid pk references auth.users, display_name text not null, avatar_path text, created_at timestamptz default now())`.
  - `is_member() returns boolean` (security definer: existe perfil para `auth.uid()`).
  - `join_group(code text, name text) returns profiles` (security definer): si `code` ≠ `app_config.invite_code` → `raise exception 'invalid_invite'`; si no, crea o actualiza el perfil.
  - `outings(id uuid pk, owner_id uuid default auth.uid(), started_at timestamptz not null, ended_at timestamptz, mode text check (mode in ('surfcasting','spinning','barco','embalse','rio','otra')), note text, share_exact boolean default false, approx_lat numeric, approx_lng numeric, created_at timestamptz default now())`.
  - `outing_companions(outing_id uuid, user_id uuid, pk (outing_id,user_id))`.
  - `catches(id uuid pk, outing_id uuid not null references outings on delete cascade, user_id uuid default auth.uid(), species_id text references species, caught_at timestamptz not null, weight_g int check (>0), length_cm numeric check (>0), bait text, note text, share_exact boolean default false, approx_lat numeric, approx_lng numeric, created_at timestamptz default now())`.
  - `catch_photos(id uuid pk, catch_id uuid references catches on delete cascade, path text not null, created_at timestamptz default now())`.
  - `outing_locations(outing_id uuid pk, lat numeric, lng numeric)` y `catch_locations(catch_id uuid pk, lat numeric, lng numeric)`.
  - `approx_coord(v numeric) returns numeric` = `floor(v / 0.05) * 0.05 + 0.025` (celda ~5 km). Triggers en `*_locations` (insert/update) que escriben `approx_lat/approx_lng` en la fila padre (security definer).
  - Trigger en `catches` antes de insert/update: si `species.legal = 'protegida'` → `raise exception 'protected_species'`.
  - Bucket de Storage `catch-photos` (privado); ruta `{user_id}/{catch_id}/{photo_id}.jpg`.
- Políticas RLS (todas exigen `is_member()`):
  - `profiles`: select todos; update solo el propio.
  - `outings`: select todos; insert/update/delete solo `owner_id = auth.uid()`.
  - `outing_companions`: select todos; insert/delete solo el dueño de la jornada.
  - `catches`: select todos; insert si `user_id = auth.uid()` **y** (es dueño de la jornada **o** está en `outing_companions`); update/delete solo el autor.
  - `catch_photos`: select todos; insert/delete solo el autor de la captura.
  - `catch_locations` / `outing_locations`: select si es autor **o** la fila padre tiene `share_exact`; insert/update/delete solo el autor.
  - Storage `catch-photos`: select miembros; insert/delete solo si el primer segmento de la ruta = `auth.uid()`.
- El cliente inserta capturas con `upsert(..., { onConflict: 'id', ignoreDuplicates: true })`.

- [ ] **Step 1: Tests pgTAP que fallan** (usar helpers para crear usuarios en `auth.users` y `set local role authenticated` + `request.jwt.claims`):
  - `membership`: usuario sin perfil → `select count(*) from catches` = 0 aunque haya filas; `join_group('mal','X')` lanza `invalid_invite`; con el código correcto crea el perfil.
  - `locations`: A crea captura con ubicación (36.5271, -6.2886); B lee `approx_lat = 36.525`, `approx_lng = -6.275`; B lee 0 filas en `catch_locations`; tras `share_exact = true` B lee 1 fila; A siempre lee la suya.
  - `catches`: insert con especie `anguila` lanza `protected_species`; B no puede insertar con `user_id` de A; C (no compañero) no puede insertar en la jornada de A; B etiquetado como compañero sí; insertar dos veces el mismo `id` con `on conflict do nothing` deja 1 fila.
- [ ] **Step 2:** `npx supabase start && npx supabase test db` → FAIL.
- [ ] **Step 3:** Escribir la migración.
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db` → PASS (el reset aplica migración + `seed.sql`).
- [ ] **Step 5:** Commit `feat: esquema Supabase con RLS y ubicación aproximada`.

---

### Task 5: Capa de datos y preparación de fotos

**Files:**
- Create: `src/data/supabase.ts`, `src/data/types.ts`, `src/data/api.ts`, `src/data/photo.ts`, `.env.example`
- Test: `src/data/photo.browser.test.ts`, `src/data/api.test.ts`

**Interfaces:**
- Consumes: esquema de Task 4; `GameCatch` (Task 3).
- Produces:
```ts
// supabase.ts — lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
export const supabase: SupabaseClient;
// types.ts
export interface Profile { id: string; displayName: string; avatarPath: string | null; }
export type OutingMode = 'surfcasting'|'spinning'|'barco'|'embalse'|'rio'|'otra';
export interface LatLng { lat: number; lng: number; }
export interface Outing { id: string; ownerId: string; startedAt: string; endedAt: string | null; mode: OutingMode; note: string | null; companionIds: string[]; approx: LatLng | null; exact: LatLng | null; shareExact: boolean; }
export interface Catch { id: string; outingId: string; userId: string; speciesId: string; caughtAt: string; weightG: number | null; lengthCm: number | null; bait: string | null; note: string | null; shareExact: boolean; approx: LatLng | null; exact: LatLng | null; photoUrls: string[]; }
export interface NewCatch { id: string; outingId: string; speciesId: string; caughtAt: string; weightG?: number; lengthCm?: number; bait?: string; note?: string; shareExact: boolean; location: LatLng | null; }
// api.ts
export function getMyProfile(): Promise<Profile | null>;
export function joinGroup(code: string, displayName: string): Promise<Profile>; // lanza Error('invalid_invite')
export function listProfiles(): Promise<Profile[]>;
export function createOuting(o: { id: string; startedAt: string; mode: OutingMode; companionIds: string[]; location: LatLng | null; shareExact: boolean; note?: string }): Promise<void>;
export function endOuting(id: string, endedAt: string): Promise<void>;
export function listOutings(filter: { userId?: string }): Promise<Outing[]>; // userId: creadas por él o en las que es compañero
export function getOuting(id: string): Promise<{ outing: Outing; catches: Catch[] }>;
export function createCatch(c: NewCatch): Promise<void>;  // idempotente por id
export function addCatchPhoto(catchId: string, photo: Blob): Promise<void>;
export function listCatches(filter: { userId?: string; outingId?: string }): Promise<Catch[]>;
export function getCatch(id: string): Promise<Catch>;
export function toGameCatch(c: Catch): GameCatch;
// photo.ts
export function preparePhoto(file: File): Promise<Blob>; // JPEG, ≤1600 px, sin EXIF
```
- Las fotos se sirven con `createSignedUrls` (1 h).

- [ ] **Step 1: Tests que fallan:**
  - `photo.browser.test.ts` (Chromium real): una imagen JPEG 4000×3000 con EXIF GPS (fixture `src/data/__fixtures__/gps.jpg`, generada con `piexifjs` en el propio test) → `preparePhoto` devuelve `image/jpeg`, con lado largo 1600, tamaño < 1 MB, y sin segmento APP1 `Exif` (comprobar que los bytes no contienen `Exif\0\0`).
  - `api.test.ts` (cliente supabase simulado): `toGameCatch` mapea `photoUrls.length` a `photoCount`; `joinGroup` traduce un error con mensaje `invalid_invite` a `Error('invalid_invite')`; `createCatch` llama a `upsert` con `ignoreDuplicates: true` y después inserta en `catch_locations` solo si `location` no es null.
- [ ] **Step 2:** `npx vitest run --project browser` y `npx vitest run src/data` → FAIL.
- [ ] **Step 3:** Implementar. `preparePhoto` con `browser-image-compression` (`maxWidthOrHeight: 1600`, `fileType: 'image/jpeg'`, `initialQuality: 0.8`, `preserveExif: false`).
- [ ] **Step 4:** Ambos comandos → PASS.
- [ ] **Step 5:** Commit `feat: capa de datos Supabase y compresión de fotos`.

---

### Task 6: Acceso (código OTP + código de invitación)

**Files:**
- Create: `src/auth/AuthProvider.tsx`, `src/auth/LoginPage.tsx`, `src/auth/JoinPage.tsx`
- Modify: `src/App.tsx` (rutas protegidas)
- Test: `src/auth/auth.test.tsx`

**Interfaces:**
- Consumes: `supabase`, `getMyProfile`, `joinGroup` (Task 5).
- Produces: `useAuth(): { status: 'loading' | 'signed_out' | 'needs_join' | 'member'; profile: Profile | null; signOut(): Promise<void> }`. Sin sesión → `/login`; con sesión sin perfil → `/unirse`; miembro → app.

- [ ] **Step 1: Tests que fallan** (supabase y api simulados):
  - `/login`: introducir email → llama a `signInWithOtp({ email, options: { shouldCreateUser: true } })` y muestra el campo "Código de 6 dígitos"; enviar el código → `verifyOtp({ email, token, type: 'email' })`.
  - Con sesión y `getMyProfile() === null` → redirige a `/unirse`.
  - `/unirse` con `joinGroup` que lanza `invalid_invite` → muestra "Código de invitación incorrecto".
  - Miembro en `/login` → redirige a `/`.
- [ ] **Step 2:** `npx vitest run src/auth` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run src/auth` → PASS.
- [ ] **Step 5:** Commit `feat: acceso con código OTP e invitación`.

---

### Task 7: Pantallas de Pescadex y ficha de especie

**Files:**
- Create: `src/pescadex/PescadexPage.tsx`, `src/pescadex/SpeciesCard.tsx`, `src/pescadex/SpeciesPage.tsx`, `src/pescadex/useMyCatches.ts`
- Test: `src/pescadex/pescadex.test.tsx`

**Interfaces:**
- Consumes: `SPECIES`, `SPECIES_BY_ID`, `capturable` (Task 2); `unlockedSpeciesIds`, `pescadexProgress` (Task 3); `listCatches`, `listProfiles`, `toGameCatch` (Task 5); `useAuth` (Task 6).
- Produces: `useMyCatches(userId: string): { catches: Catch[]; loading: boolean; reload(): void }` (lo reutilizan Tasks 9 y 10).
- Comportamiento: rejilla con número (orden del catálogo, `#001`), filtros Mar / Agua dulce, rareza y Capturadas / Pendientes; cabecera "23/74 (31%)". Sin desbloquear: silueta oscura y "???", salvo protegidas, que muestran 🔒 y su nombre. Reguladas con ⚠️. Ficha: descripción, rareza, temporada (meses), zonas, aviso legal; si está desbloqueada, mis capturas y mi mayor peso/medida; lista de miembros del grupo que la tienen.

- [ ] **Step 1: Tests que fallan:**
  - Sin capturas: la tarjeta de `dorada` muestra "???" y no "Dorada"; la de `anguila` muestra "Anguila" y 🔒; cabecera `0/<total> (0%)`.
  - Con una dorada con foto: la tarjeta muestra "Dorada"; cabecera `1/<total>`.
  - Dorada sin foto: sigue "???".
  - Filtro "Agua dulce" oculta `dorada` y muestra `barbo-gitano`.
  - Ficha de `mero` muestra ⚠️ y su `legalNote`.
- [ ] **Step 2:** `npx vitest run src/pescadex` → FAIL.
- [ ] **Step 3:** Implementar (siluetas: un SVG genérico de pez por `group`, coloreado en negro si no está desbloqueada).
- [ ] **Step 4:** `npx vitest run src/pescadex` → PASS.
- [ ] **Step 5:** Commit `feat: pantalla Pescadex y ficha de especie`.

---

### Task 8: Cuaderno de jornadas

**Files:**
- Create: `src/outings/NotebookPage.tsx`, `src/outings/OutingPage.tsx`, `src/outings/useActiveOuting.ts`, `src/catches/CatchPage.tsx`
- Test: `src/outings/outings.test.tsx`, `src/catches/catchPage.test.tsx`

**Interfaces:**
- Consumes: `createOuting`, `endOuting`, `listOutings`, `getOuting`, `getCatch`, `addCatchPhoto`, `listProfiles` (Task 5); `preparePhoto` (Task 5); `useAuth` (Task 6).
- Produces: `useActiveOuting(): { active: Outing | null; start(input: { mode: OutingMode; companionIds: string[]; shareExact: boolean }): Promise<Outing>; end(): Promise<void> }`. Activa = la última jornada (propia o como compañero) con `endedAt === null` y `startedAt` en las últimas 18 h.
- Cuaderno: pestañas "Mías" / "Grupo"; cada jornada muestra fecha, modalidad, participantes y número de capturas ("En blanco" si 0). "Empezar jornada" (modalidad + compañeros + compartir ubicación exacta) y "Terminar jornada". Detalle de jornada: datos y capturas de todos los participantes. Detalle de captura: fotos, especie, datos, autor; si no tiene fotos, etiqueta "Sin foto · no puntúa", y si eres el autor, botón "Añadir foto".

- [ ] **Step 1: Tests que fallan:**
  - Empezar jornada eligiendo "Spinning" y un compañero → `createOuting` con `mode: 'spinning'`, `companionIds: [id]`, `id` uuid; la UI muestra "Jornada en curso".
  - Jornada sin capturas en la lista → "En blanco".
  - Jornada iniciada hace 20 h sin terminar → no es activa.
  - Detalle de captura propia sin fotos → "Sin foto · no puntúa" y botón "Añadir foto"; al elegir un archivo llama a `preparePhoto` y `addCatchPhoto`. Captura ajena sin fotos → sin botón.
- [ ] **Step 2:** `npx vitest run src/outings src/catches/catchPage` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mismo comando → PASS.
- [ ] **Step 5:** Commit `feat: cuaderno de jornadas y detalle de captura`.

---

### Task 9: Registrar captura

**Files:**
- Create: `src/catches/RegisterPage.tsx`, `src/catches/SpeciesPicker.tsx`, `src/catches/useGeolocation.ts`
- Test: `src/catches/register.test.tsx`

**Interfaces:**
- Consumes: `SPECIES`, `capturable` (Task 2); `catchXpEvents`, `totalXp`, `levelInfo` (Task 3); `createCatch`, `addCatchPhoto`, `preparePhoto` (Task 5); `useActiveOuting` (Task 8); `useMyCatches` (Task 7).
- Produces: `useGeolocation(): { request(): Promise<LatLng | null> }` (timeout 10 s, `enableHighAccuracy: true`; null si se deniega o falla).
- Flujo: foto(s) (`<input type="file" accept="image/*" capture="environment" multiple>`) → especie (buscador por nombre común o científico; las protegidas no aparecen) → peso (g), medida (cm), cebo, nota, "Compartir ubicación exacta" (desmarcado) → Guardar. Si no hay jornada activa, se crea una con modalidad `otra` y se le asocia la captura. El `id` de la captura se genera al abrir el formulario y el botón se deshabilita mientras guarda. Tras guardar: si es la primera de la especie, aviso "¡Nueva especie! +N XP"; si sube de nivel, "¡Subida de nivel! Nivel N · Título".

- [ ] **Step 1: Tests que fallan:**
  - El buscador con "angu" no ofrece `anguila`; con "dora" ofrece `dorada`.
  - Guardar sin especie → botón deshabilitado.
  - GPS denegado (`request` → null) → guarda con `location: null` y muestra "Sin ubicación".
  - Sin jornada activa → llama a `start({ mode: 'otra', companionIds: [], shareExact: false })` y después a `createCatch` con ese `outingId`.
  - Doble clic en Guardar → `createCatch` llamado una sola vez.
  - Primera dorada con foto → muestra "¡Nueva especie! +75 XP".
  - Sin foto → guarda y muestra "Guardada sin foto · no puntúa".
- [ ] **Step 2:** `npx vitest run src/catches/register` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mismo comando → PASS.
- [ ] **Step 5:** Commit `feat: registrar captura`.

---

### Task 10: Perfil

**Files:**
- Create: `src/profile/ProfilePage.tsx`
- Test: `src/profile/profile.test.tsx`

**Interfaces:**
- Consumes: `levelInfo`, `totalXp`, `unlockedSpeciesIds`, `pescadexProgress` (Task 3); `listOutings`, `listProfiles` (Task 5); `useMyCatches` (Task 7); `useAuth` (Task 6).
- `/perfil/:userId` (propio o de un amigo): avatar (iniciales si no hay), nombre, "Nv. N · Título", barra de XP `xpIntoLevel/xpForNext`, Pescadex `x/total (p%)`, récords (mayor peso por especie, las 5 primeras), últimas 10 capturas con enlace al detalle. Lista de miembros del grupo para ir a sus perfiles. En el propio: "Cerrar sesión" y editar nombre.

- [ ] **Step 1: Tests que fallan:**
  - Usuario con 1 dorada con foto y 2 jornadas → "Nv. 1 · Grumete" y XP `85/100`.
  - Pescadex `1/<total>`.
  - Perfil de otro usuario no muestra "Cerrar sesión".
- [ ] **Step 2:** `npx vitest run src/profile` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mismo comando → PASS.
- [ ] **Step 5:** Commit `feat: perfil con nivel y progreso`.

---

### Task 11: Puesta en marcha y documentación

**Files:**
- Create: `README.md`
- Modify: `.env.example`

- [ ] **Step 1:** README en español con:
  1. Crear proyecto gratuito en Supabase; copiar URL y clave anon a `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  2. `npx supabase link` y `npx supabase db push`; ejecutar `supabase/seed.sql`; fijar el código de invitación: `insert into app_config (id, invite_code) values (1, '...')`.
  3. Auth → Email: activar OTP y cambiar la plantilla para que incluya `{{ .Token }}` (código de 6 dígitos).
  4. Desplegar en Netlify enlazando el repo, con las dos variables de entorno.
  5. Instalar en el móvil: iPhone (Safari → Compartir → Añadir a pantalla de inicio) y Android (Chrome → Instalar app).
  6. Desarrollo: `npm run dev`, `npm test`, `npm run test:browser`, `npm run test:db`.
- [ ] **Step 2:** Verificación completa: `npm test && npm run test:browser && npm run test:db && npm run build` → todo PASS. Prueba manual con `npm run dev` en un viewport móvil (Playwright, 390×844): login simulado, registrar una captura con foto y ver la especie desbloqueada.
- [ ] **Step 3:** Commit `docs: guía de puesta en marcha`.
