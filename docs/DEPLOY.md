# Despliegue en producción — Toby ¡Mi Hamburguesa!

Producción corre en un **VPS propio (Ubuntu) con systemd + nginx**. Netlify, Vercel y
Cloudflare no se usan para el sitio en vivo.

## Topología objetivo

> Esta es la topología planeada para Toby; el VPS aún no está aprovisionado para
> este repo. Confirma puerto, rutas y nombre de servicio antes del primer deploy.

| Elemento | Valor |
| -------- | ----- |
| URL pública | <https://toby.clubemkt.digital> |
| Código fuente | `/root/ClubeMkt/toby-app` |
| Build desplegado | `/var/www/tobyburguers` (árbol standalone: `server.js`, `node_modules/`, `.next/`, `public/`) |
| Servicio | `tobyburguers.service` (systemd) |
| Puerto interno | `3016` (`PORT` en la unit — el `3015` de Pollos Campeón sigue ocupado) |
| Proxy | nginx `sites-enabled/tobyburguers` → `http://172.17.0.1:3016` |
| Variables de entorno | `EnvironmentFile=/root/ClubeMkt/toby-app/.env` (chmod 600) |
| Uploads | `UPLOAD_DIR=/var/www/toby-data/uploads` |
| Base de datos | contenedor Docker `toby-db` (postgres:15-alpine) en `127.0.0.1:5438`, volumen `toby-db-data`; contraseña en `/root/.toby-dbpass` |

> El kit de marca (fotos originales del sitio, `data/*.json`, fichas) vive aparte,
> en `/root/ClubeMkt/tobyburguers`. No es código y el despliegue no lo toca.

`next.config.ts` genera `output: "standalone"` en el VPS (en Netlify/Vercel se
desactiva porque esas plataformas empaquetan la app por su cuenta).

> Corre **una sola instancia**: las alertas de pedidos y el rate limit viven en
> memoria del proceso.

## Desplegar

```bash
cd /root/ClubeMkt/toby-app
git pull
bash scripts/deploy.sh
```

El script:

1. `npm install` y `npx prisma generate`.
2. `npx prisma migrate deploy`.
3. `npm run build`.
4. Copia el build standalone a `/var/www/tobyburguers`, incluido el
   `node_modules` reducido del standalone, y sincroniza `public/`.
5. Limpia `.next/cache` y reinicia `tobyburguers.service`.
6. Comprueba `http://127.0.0.1:3016/` hasta obtener `200`.

## Primera instalación (base de datos vacía)

El script no carga datos. Después de crear el contenedor y la unit:

```bash
cd /root/ClubeMkt/toby-app
npm install && npx prisma generate
npx prisma migrate deploy
npm run db:seed          # 9 categorías, 34 productos, 5 sucursales de referencia
npm run db:create-admin  # ADMIN_EMAIL / ADMIN_PASSWORD del .env
bash scripts/deploy.sh   # como arriba, con DEPLOY_DIR/SERVICE/HEALTH_URL
```

## Operación

```bash
systemctl status tobyburguers.service
systemctl restart tobyburguers.service
journalctl -u tobyburguers.service -f
curl -I http://127.0.0.1:3016/
curl -s http://127.0.0.1:3016/api/health
```

`start-store.sh` es solo un respaldo manual para arrancar el build desplegado;
lo normal es usar systemd.

## Migraciones

- `deploy.sh` aplica las pendientes con `prisma migrate deploy`.
- En local: `npm run db:migrate` para crear/aplicar una migración nueva.
- Estado: `npx prisma migrate status` (debe decir *Database schema is up to date*).

## Uploads

Las imágenes subidas desde el panel se guardan **fuera** del build, en
`UPLOAD_DIR`, y se sirven por `/uploads/products/[file]` y
`/uploads/references/[file]`. El despliegue no toca esa carpeta. Respalda
`/var/www/toby-data/uploads`.

## Rollback

```bash
git checkout <commit-anterior>
bash scripts/deploy.sh
```

Las migraciones son solo hacia adelante: para revertir una hay que restaurar la
base de datos.

## Alternativas no usadas

El repo conserva `Dockerfile`, `netlify.toml`, `vercel.json` y `wrangler.jsonc`
como andamiaje opcional. El destino real es el VPS.
