# Reverb en producción (FoodSaaS VPS)

No ejecutes `php artisan reverb:start` a mano en producción. Usa **Supervisor** (el “robot” que reinicia el proceso si cae).

## 1. Elegir un puerto libre

```bash
ss -tlnp | grep -E ':(8080|8081|8082)\s' || true
```

Si `8080` y `8081` están ocupados, usa **8082** (como en `deploy/supervisor/foodsaas-reverb.conf`).

## 2. `.env` en el VPS

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=576944
REVERB_APP_KEY=hwnhyym56ikxyo3bpivf
REVERB_APP_SECRET=lxftwzruptdaty4lg3vk

# Público (clientes / Echo vía Nginx TLS)
REVERB_HOST=foodsaas.orvae.pe
REVERB_PORT=443
REVERB_SCHEME=https

# Proceso local (Supervisor)
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8082
```

Luego:

```bash
cd /var/www/foodsaas
php artisan config:clear
php artisan config:cache
php artisan route:clear
php artisan route:cache
# Importante: /broadcasting/auth vive en routes/web.php para sobrevivir route:cache.
```

> Ajusta `REVERB_HOST` al dominio real del SaaS. `APP_ID/KEY/SECRET` deben coincidir con los del servidor.

## 3. Supervisor

```bash
sudo apt install -y supervisor   # si no está
sudo cp /var/www/foodsaas/deploy/supervisor/foodsaas-reverb.conf /etc/supervisor/conf.d/
sudo mkdir -p /var/www/foodsaas/storage/logs
sudo chown -R www-data:www-data /var/www/foodsaas/storage
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start foodsaas-reverb
sudo supervisorctl status foodsaas-reverb
```

Comandos útiles:

```bash
sudo supervisorctl status
sudo supervisorctl restart foodsaas-reverb
sudo tail -f /var/www/foodsaas/storage/logs/reverb.log
```

## 4. Nginx (WebSocket por HTTPS)

Dentro del `server` de `foodsaas.orvae.pe` (y wildcards de tenant si aplica):

```nginx
location /app {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
    proxy_pass http://127.0.0.1:8082;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Echo se conecta a `wss://foodsaas.orvae.pe/app/...` (puerto 443). Reverb escucha solo en `127.0.0.1:8082`.

## 5. Cola (opcional, mismo patrón)

```bash
sudo cp /var/www/foodsaas/deploy/supervisor/foodsaas-queue.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start foodsaas-queue:*
```
