<?php

return [

    /*
    |--------------------------------------------------------------------------
    | OpenWA — solo la sesión de plataforma (superadmin)
    |--------------------------------------------------------------------------
    |
    | FoodSaaS no abre WhatsApp por restaurante desde aquí. El superadmin
    | vincula un número de la casa (avisos, pruebas) escaneando el QR.
    |
    */
    'enabled' => filter_var(env('OPENWA_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

    'api_url' => rtrim((string) env('OPENWA_API_URL', ''), '/'),

    'api_key' => env('OPENWA_API_KEY'),

    'timeout_seconds' => (int) env('OPENWA_TIMEOUT_SECONDS', 20),

    'platform_session_name' => env('OPENWA_PLATFORM_SESSION_NAME', 'foodsaas-platform'),

];
