<?php

return [

    'orvae' => [
        'resumen' => env('SALESBOT_ORVAE_RESUMEN', 'Software de restaurante en la nube: mesas, cocina, caja e inventario por subdominio propio.'),
        'publico' => env('SALESBOT_ORVAE_PUBLICO', 'Restaurantes, bares y dark kitchens en Perú que quieren operar sin Excel ni sistemas cerrados.'),
        'palabras_clave' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('SALESBOT_ORVAE_KEYWORDS', 'restaurante,POS,cocina,KDS,foodsaas,orvae')),
        ))),
    ],

    'demo_url' => env('FOODSAAS_DEMO_URL'),
    'demo_email' => env('FOODSAAS_DEMO_EMAIL'),
    'demo_password' => env('FOODSAAS_DEMO_PASSWORD'),
    'register_url' => env('FOODSAAS_REGISTER_URL', 'https://orvae.pe/software/foodsaas'),
];
