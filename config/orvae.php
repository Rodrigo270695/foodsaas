<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Integración Orvae PE -> FoodSaaS
    |--------------------------------------------------------------------------
    |
    | Orvae PE hace POST al endpoint interno firmado con HMAC-SHA256 sobre
    |     "{timestamp}.{raw_body}"
    | Cabeceras:
    |   X-Orvae-Timestamp, X-Orvae-Signature (sha256=<hex>), X-Idempotency-Key
    |
    | El mismo secret debe estar en Orvae: FOODSAAS_PROVISION_HMAC_SECRET
    | (o ORVAE_PROVISION_HMAC_SECRET compartido).
    */

    'provision' => [
        'hmac_secret' => env('ORVAE_PROVISION_HMAC_SECRET'),
        'max_skew_seconds' => (int) env('ORVAE_PROVISION_MAX_SKEW_SECONDS', 300),
        'idempotency_ttl_days' => (int) env('ORVAE_PROVISION_IDEMPOTENCY_TTL_DAYS', 30),
    ],

    'tenant' => [
        'scheme' => env('FOODSAAS_TENANT_SCHEME', env('TENANT_URL_SCHEME', 'https')),
        'domain' => env('FOODSAAS_TENANT_DOMAIN', env('TENANT_ROOT_DOMAIN', 'foodsaas.orvae.pe')),
        'login_path' => env('FOODSAAS_TENANT_LOGIN_PATH', '/login'),
        'bootstrap_ttl_hours' => (int) env('FOODSAAS_BOOTSTRAP_TTL_HOURS', 48),
    ],
];
