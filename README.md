# 🎣 Pescadex

La Pokédex de pesca del grupo: registra jornadas y capturas con foto, desbloquea las
especies de Andalucía (mar y río), sube de nivel y pica a tus amigos.

Es una **app web instalable (PWA)**: se abre con un enlace y se añade a la pantalla de
inicio del móvil, tanto en iPhone como en Android. No hace falta pasar por ninguna tienda de apps.

- Diseño: [`docs/superpowers/specs/2026-11-22-pescadex-design.md`](docs/superpowers/specs/2026-11-22-pescadex-design.md)
- Plan de la fase 1: [`docs/superpowers/plans/2026-11-22-pescadex-fase1.md`](docs/superpowers/plans/2026-11-22-pescadex-fase1.md)
- Catálogo de especies: [`src/catalog/species.json`](src/catalog/species.json) (estudio base en [`docs/especies-andalucia.md`](docs/especies-andalucia.md))

---

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto de Supabase (gratis)

1. Entra en <https://supabase.com>, crea una cuenta y un proyecto nuevo (región: *West EU*).
2. En **Project Settings → API** copia la **Project URL** y la clave **anon public**.
3. Copia `.env.example` a `.env` y pega esos dos valores:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

### 2. Crear las tablas

Opción A (con la terminal):

```bash
npx supabase login
npx supabase link --project-ref <tu-ref>
npx supabase db push
```

Opción B (sin terminal): en el panel de Supabase, abre **SQL Editor** y ejecuta el contenido de
`supabase/migrations/20261122000000_init.sql`.

Después, en el **SQL Editor**, ejecuta también:

1. El contenido de `supabase/seed.sql` (carga las especies).
2. El código de invitación del grupo (cámbialo por el que quieras):

   ```sql
   insert into app_config (id, invite_code) values (1, 'boqueron2026')
   on conflict (id) do update set invite_code = excluded.invite_code;
   ```

### 3. Configurar el inicio de sesión con código

En **Authentication → Sign In / Providers → Email**: deja activado *Email* y desactiva
*Confirm email* si quieres que el primer acceso sea inmediato.

En **Authentication → Email Templates → Magic Link**, cambia el cuerpo para que envíe el
código de 6 dígitos (la app no usa enlaces, porque en iPhone abren Safari en lugar de la app):

```html
<h2>Tu código para Pescadex</h2>
<p>Introduce este código en la app: <strong>{{ .Token }}</strong></p>
```

Haz lo mismo en la plantilla **Confirm signup**.

> El servicio de correo gratuito de Supabase permite pocos emails por hora. Para un grupo de
> amigos sobra, pero si alguno no recibe el código, que espere unos minutos.

### 4. Publicar la app (gratis, con Netlify)

1. Entra en <https://app.netlify.com>, **Add new site → Import an existing project** y elige este repositorio.
2. Netlify detecta la configuración (`netlify.toml`). En **Environment variables** añade
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Despliega. Te dará una dirección tipo `https://pescadex-xxx.netlify.app`.
4. En Supabase, **Authentication → URL Configuration**, pon esa dirección como *Site URL*.

### 5. Instalarla en el móvil

- **iPhone:** abre el enlace en **Safari** → botón Compartir → **Añadir a pantalla de inicio**.
- **Android:** abre el enlace en **Chrome** → menú ⋮ → **Instalar aplicación**.

Pasa el enlace y el código de invitación a tus amigos. Cada uno entra con su email, recibe un
código, se une con el código de invitación ¡y a pescar!

---

## Desarrollo

```bash
npm install
npm run dev            # servidor local
npm test               # tests unitarios y de pantallas
npm run test:browser   # tests en Chromium real (compresión de fotos)
npm run test:db        # tests de la base de datos (Postgres 16 + pgTAP locales)
npm run gen:seed       # regenera supabase/seed.sql desde src/catalog/species.json
npm run build          # compila la PWA en dist/
```

`npm run test:db` usa un Postgres 16 local con pgTAP y una imitación mínima de Supabase
(`supabase/shim/supabase_shim.sql`).

### Editar el catálogo

Las especies están en `src/catalog/species.json`. Tras cambiarlas, ejecuta `npm run gen:seed`
y vuelve a ejecutar `supabase/seed.sql` en Supabase.
