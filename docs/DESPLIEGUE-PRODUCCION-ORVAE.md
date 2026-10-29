# Despliegue FoodSaaS + Orvae (patrón VetSaaS)

Guía para subir **FoodSaaS** al servidor, enlazar **Orvae PE** y dejar listo el **tenant demo** (`demo.foodsaas.orvae.pe`).

## 1. Git — qué subir

Repositorios separados (como VetSaaS):

| Repo | Ruta local |
|------|------------|
| FoodSaaS | `d:\Programacion\Laravel\LaraReact\foodsaas` |
| Orvae PE | `D:\Programacion\Laravel\LaraReact\orvaepe` |

En cada uno:

```bash
git status
git add -A
git commit -m "Integración Orvae: provisión FoodSaaS y tenant demo"
git push origin main
```

No commitear `.env` ni secretos. Usar `.env.production.example` (FoodSaaS) y comentarios en `.env.example` (Orvae).

## 2. DNS y TLS (servidor)

Igual que VetSaaS:

1. **Apex** `foodsaas.orvae.pe` → IP del VPS (panel plataforma + API).
2. **Wildcard** `*.foodsaas.orvae.pe` → misma IP (tenants: `demo`, clientes, etc.).
3. Certificado Let's Encrypt wildcard (o dos certs: apex + wildcard).

Orvae sigue en `orvae.pe` (no cambia).

## 3. FoodSaaS — variables `.env` (producción)

Copia `.env.production.example` → `.env` en el servidor y completa:

| Variable | Uso |
|----------|-----|
| `APP_URL` | `https://foodsaas.orvae.pe` |
| `ORVAE_PROVISION_HMAC_SECRET` | Secreto compartido con Orvae (HMAC SHA-256) |
| `TENANT_ROOT_DOMAIN` / `TENANT_CENTRAL_DOMAINS` | `foodsaas.orvae.pe` |
| `FOODSAAS_TENANT_DOMAIN` | Mismo dominio tenant (URLs que Orvae muestra al cliente) |
| `DB_*` | PostgreSQL obligatorio (multi-schema) |
| `FOODSAAS_DEMO_URL` | `https://demo.foodsaas.orvae.pe/login` |
| `PLATFORM_SUPERADMIN_PASSWORD` | Solo para `db:seed` inicial |

Generar secreto (una vez, mismo en Orvae):

```bash
openssl rand -hex 32
```

## 4. FoodSaaS — comandos en el servidor

```bash
cd /var/www/foodsaas   # tu ruta

composer install --no-dev --optimize-autoloader
npm ci && npm run build

cp .env.production.example .env
# editar .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
# geo Perú si aplica:
php artisan db:seed --class=GeoCatalogSeeder --force
php artisan foodsaas:geo-fix-encoding

php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Cola (correo, jobs):

```bash
php artisan queue:work --queue=default --sleep=1
```

## 5. Tenant **demo** (sin checkout Orvae)

Para la primera oferta comercial usás un restaurante fijo `slug=demo`:

1. Entrá a `https://foodsaas.orvae.pe` como superadmin.
2. **Plataforma → Tenants** → crear:
   - **Slug:** `demo`
   - Razón social / admin / distrito (Perú).
3. **Plataforma → Suscripciones** → plan activo (p. ej. `starter` o `pro`) para ese tenant.
4. En la fila del tenant → **Crear schema** (o `php artisan foodsaas:tenant-migrate rest_demo`).
5. Crear usuario admin del restaurante (recover-admin en plataforma cuando esté cableado, o usuario con `tenant_id` del demo).
6. Probar `https://demo.foodsaas.orvae.pe/login`.

En `.env` de FoodSaaS dejá `FOODSAAS_DEMO_*` apuntando a ese login para que Orvae Sales Hub lea el knowledge (`GET /api/internal/saas/salesbot-knowledge` firmado).

## 6. Orvae PE — variables `.env`

Añadí (mismo HMAC que en FoodSaaS):

```env
FOODSAAS_PROVISIONING_ENABLED=true
FOODSAAS_PROVISION_URL=https://foodsaas.orvae.pe/api/internal/saas/provision
FOODSAAS_RENEW_URL=https://foodsaas.orvae.pe/api/internal/saas/renew
FOODSAAS_LOOKUP_URL=https://foodsaas.orvae.pe/api/internal/saas/lookup
FOODSAAS_PROVISION_HMAC_SECRET=<el mismo ORVAE_PROVISION_HMAC_SECRET>
FOODSAAS_TENANT_DOMAIN=foodsaas.orvae.pe
FOODSAAS_TENANT_SCHEME=https
# Opcional: URL fija de knowledge (si no, Orvae deduce .../salesbot-knowledge)
# FOODSAAS_KNOWLEDGE_URL=https://foodsaas.orvae.pe/api/internal/saas/salesbot-knowledge
```

Tras cambiar `.env` en Orvae:

```bash
php artisan config:cache
```

## 7. Orvae — catálogo SKU FoodSaaS

En el producto/SKU de checkout (como VetSaaS), metadata ejemplo:

```json
{
  "saas_product": "foodsaas",
  "foodsaas_plan_slug": "starter",
  "foodsaas_tenant_slug": "demo"
}
```

- `foodsaas_plan_slug` debe existir en `plans.codigo` de FoodSaaS (`free`, `starter`, `pro`, `restaurante`, …).
- `foodsaas_tenant_slug` **opcional**: fijá `demo` para renovaciones/checkout de la demo; clientes nuevos sin este campo reciben slug auto desde Orvae.

Cuando un pedido se paga, Orvae llama `POST .../provision` o `.../renew` firmado; FoodSaaS responde `login_url` y `bootstrap_url`.

## 8. Comprobación rápida

| Prueba | Cómo |
|--------|------|
| API viva | `curl -s https://foodsaas.orvae.pe/up` |
| Knowledge | Orvae Sales Hub o test `SaasKnowledgeTest` con `services.foodsaas.enabled=true` |
| Provisión | Checkout de prueba en Orvae con SKU foodsaas (staging) |
| Demo | Navegador → `https://demo.foodsaas.orvae.pe` |

## 9. Endpoints FoodSaaS (server-to-server)

Todos bajo `VerifyOrvaeProvisionSignature` (cabeceras `X-Orvae-Timestamp`, `X-Orvae-Signature`, `X-Idempotency-Key`):

- `POST /api/internal/saas/provision`
- `POST /api/internal/saas/renew`
- `GET /api/internal/saas/lookup?email=`
- `GET /api/internal/saas/tenants/{slug}`
- `GET /api/internal/saas/salesbot-knowledge`

Contrato idéntico a VetSaaS/TallerSaaS documentado en Orvae (`VetSaaSPlanProvisioner` / `FoodSaaSPlanProvisioner`).
