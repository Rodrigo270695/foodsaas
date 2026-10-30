<?php

return [
    'slug' => env('FOODSAAS_DEMO_SLUG', 'demo'),

    /**
     * Rutas con mutación permitidas en el tenant demo (login, salir, etc.).
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
