# Timings IAO

App estatica en Next.js para registrar la ultima muerte de bosses y calcular
su ventana de aparicion.

## Desarrollo

```bash
npm.cmd install
npm.cmd run dev
```

## Supabase

La app funciona con `localStorage` si no hay variables de entorno, pero para
compartir datos entre usuarios conviene usar Supabase.

1. Crear un proyecto gratuito en Supabase.
2. Ejecutar el SQL de `supabase/schema.sql`.
3. Crear `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
NEXT_PUBLIC_SUPABASE_TABLE=boss_records
```

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` publica el sitio cuando haces
push a `main`.

En el repositorio de GitHub hay que configurar:

1. `Settings` -> `Pages` -> `Build and deployment` -> `GitHub Actions`.
2. `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`.
3. Agregar `NEXT_PUBLIC_SUPABASE_URL`.
4. Agregar `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Para exportar localmente con rutas compatibles con GitHub Pages:

```bash
$env:GITHUB_PAGES='true'; npm.cmd run build
```

El build estatico queda en `out/`.

## Discord

Los avisos de Discord se ejecutan desde Supabase Edge Functions y el cron de
Supabase. La funcion versionada vive en `supabase/functions/notify-spawns`.
