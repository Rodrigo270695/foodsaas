<?php

return [
    'migration_schema' => env('TENANT_MIGRATION_SCHEMA'),

    'central_domains' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('TENANT_CENTRAL_DOMAINS', 'localhost,127.0.0.1,foodsaas.test')),
    ))),

    'schema_prefix' => 'rest_',
    'cache_ttl' => (int) env('TENANT_CACHE_TTL', 60),
    'allowed_states' => ['trial', 'active', 'grace', 'suspended'],
    'root_domain' => env('TENANT_ROOT_DOMAIN', 'foodsaas.test'),
    'scheme' => env('TENANT_URL_SCHEME', 'https'),
];
