<?php

return [
    'slug' => env('FOODSAAS_DEMO_SLUG', 'demo'),

    /**
     * Auth y salida: siempre permitidas en demo.
     * El resto de mutaciones se permiten salvo Configuración (`configuracion.*`).
     *
     * @var list<string>
     */
    'allowed_mutation_route_names' => [
        'login.store',
        'logout',
        'passkey.login',
        'two-factor.login.store',
        'password.email',
        'password.update',
        'password.confirm.store',
        'verification.send',
        'tenant.auth.bootstrap.store',
        'impersonate.leave',
    ],
];
