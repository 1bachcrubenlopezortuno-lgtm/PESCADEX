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

### 2. Crear las tablas, las especies y el código de invitación

1. Abre `supabase/instalacion-completa.sql` en GitHub, pulsa **Raw** y copia todo el texto.
2. En Supabase: **SQL Editor** → **New query** → pega → **Run**.
3. Abajo aparece el **código de invitación** del grupo (un texto aleatorio). Apúntalo y pásaselo
   solo a tus amigos: quien lo tenga puede ver las fotos y zonas del grupo.
   Si se filtra, genera otro ejecutando:

   ```sql
   update app_config set invite_code = encode(gen_random_bytes(9), 'base64') where id = 1 returning invite_code;
   ```

> Si modificas el catálogo o la migración, regenera ese archivo (`npm run gen:seed` y vuelve a
> juntar `supabase/migrations/*.sql` + `supabase/seed.sql`).

### 3. Entrar con email y contraseña (sin emails)

La app usa **email + contraseña** y no envía ningún correo. Solo hay que desactivar la confirmación:

1. Supabase → icono **Authentication** (barra izquierda) → **Sign In / Providers**.
2. Pulsa **Email**.
3. Desactiva el interruptor **Confirm email** y pulsa **Save**.

**Si alguien olvida su contraseña**, cámbiasela tú desde **SQL Editor** (no borres el usuario: se
borrarían también todas sus capturas):

```sql
update auth.users set encrypted_password = crypt('nueva-contraseña', gen_salt('bf')) where email = 'amigo@email.com';
```

### 4. Publicar la app (gratis, con Netlify)

1. Entra en <https://app.netlify.com>, **Add new site → Import an existing project** y elige este repositorio.
2. Netlify detecta la configuración (`netlify.toml`). En **Environment variables** añade
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Despliega. Te dará una dirección tipo `https://pescadex-xxx.netlify.app`.
4. En Supabase, **Authentication → URL Configuration**, pon esa dirección como *Site URL*.

### 5. Instalarla en el móvil

- **iPhone:** abre el enlace en **Safari** → botón Compartir → **Añadir a pantalla de inicio**.
- **Android:** abre el enlace en **Chrome** → menú ⋮ → **Instalar aplicación**.

Pasa el enlace y el código de invitación a tus amigos. Cada uno crea su cuenta con email y
contraseña, se une con el código de invitación ¡y a pescar!

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
