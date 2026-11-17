<?php

return [

    'orvae' => [
        'resumen' => env(
            'SALESBOT_ORVAE_RESUMEN',
            'Sistema en la nube para restaurantes: salón, pedidos, cocina, caja, carta, almacén y comprobantes SUNAT. Cada local entra por su propio subdominio.',
        ),
        'publico' => env(
            'SALESBOT_ORVAE_PUBLICO',
            'Restaurantes, bares, cafeterías y cocinas ocultas en Perú que quieren operar salón, cocina y caja sin Excel ni un POS cerrado.',
        ),
        'palabras_clave' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env(
                'SALESBOT_ORVAE_KEYWORDS',
                'foodsaas,food saas,restaurante,restaurantes,bar,cafetería,cocina oculta,dark kitchen,POS,punto de venta,salón,mesas,comanda,cocina,KDS,caja,carta,menú,delivery,reservas,SUNAT,boleta,factura,yape',
            )),
        ))),
    ],

    'modulos' => [
        ['titulo' => 'Salón', 'contenido' => 'Zonas y mesas: libre, ocupada o en cuenta. Se pueden unir mesas. El pedido nace en la mesa.'],
        ['titulo' => 'Pedidos', 'contenido' => 'Salón, para llevar o delivery. Cada plato tiene estado: enviado, en cocina o listo.'],
        ['titulo' => 'Cocina', 'contenido' => 'La comanda llega sola al pase. Mesero y cocina la usan en celular o tablet, sin instalar un programa.'],
        ['titulo' => 'Caja', 'contenido' => 'Apertura de turno, ventas del día, efectivo, Yape y tarjeta. El cobro cierra el pedido.'],
        ['titulo' => 'Carta', 'contenido' => 'Categorías, precios y lo que hoy está en menú. La carta pública sale del mismo catálogo.'],
        ['titulo' => 'Recetas y almacén', 'contenido' => 'El plato vendido descuenta insumos. Compras, stock bajo y kardex viven en el sistema.'],
        ['titulo' => 'Delivery y reservas', 'contenido' => 'Pedidos en camino por distrito y reservas de mesa en el mismo local. Dependen del plan.'],
        ['titulo' => 'SUNAT', 'contenido' => 'Boleta y factura electrónica al cobrar, con series del local. Notas y guías según el plan.'],
        ['titulo' => 'Multi-sede', 'contenido' => 'Cada local tiene su carta y su caja. El plan define cuántas sedes y si hay consolidado.'],
    ],

    'faq' => [
        ['titulo' => '¿Qué es FoodSaaS?', 'contenido' => 'Es el sistema del restaurante en la nube: salón, pedidos, cocina, caja, carta, almacén y comprobantes SUNAT. Cada local entra por su subdominio.'],
        ['titulo' => '¿Sirve para un restaurante en Perú?', 'contenido' => 'Sí. Está pensado para restaurantes, bares, cafeterías y cocinas ocultas en Perú, con boleta y factura electrónica.'],
        ['titulo' => '¿El mesero y la cocina usan el celular?', 'contenido' => 'Sí. Salón y cocina funcionan como aplicación web en celular o tablet.'],
        ['titulo' => '¿Todos los planes traen lo mismo?', 'contenido' => 'No. Salón, pedidos, cocina y caja son la base. Delivery, reservas, WhatsApp, multi-sede y los comprobantes SUNAT cambian según el plan. Hay que leer el incluye de cada plan.'],
        ['titulo' => '¿Emite a SUNAT?', 'contenido' => 'Sí, cuando el plan incluye boletas o facturas electrónicas. Se emiten al cobrar, con las series del restaurante.'],
        ['titulo' => '¿Cómo lo activo?', 'contenido' => 'Se elige el plan en orvae.pe/software/foodsaas, se confirma y se entra al subdominio del restaurante a crear la contraseña.'],
        ['titulo' => '¿Hay demo?', 'contenido' => 'Sí. Hay demo pública con datos de ejemplo para recorrer salón, cocina y caja.'],
        ['titulo' => '¿Sirve si tengo más de un local?', 'contenido' => 'Sí, si el plan incluye más de una sede. Cada local opera su caja y, según el plan, se puede ver el consolidado.'],
    ],

    'objeciones' => [
        ['titulo' => 'Quiero probar antes de pagar', 'contenido' => 'Ofrecer la demo pública y, si existe, el plan gratis. No inventar un precio que no esté en los planes.'],
        ['titulo' => 'Ya uso un POS o Excel', 'contenido' => 'Con FoodSaaS la comanda sale de la mesa a la cocina y el cobro puede emitir el comprobante. El stock baja con la venta, no con un cuaderno.'],
        ['titulo' => '¿También hacen delivery?', 'contenido' => 'Delivery y reservas están en FoodSaaS, pero hay que confirmar que el plan del cliente los incluye.'],
    ],

    'novedades' => [],

    'demo_url' => env('FOODSAAS_DEMO_URL', 'https://demo.foodsaas.orvae.pe/login'),
    'demo_email' => env('FOODSAAS_DEMO_EMAIL', 'demo@foodsaas.pe'),
    'demo_password' => env('FOODSAAS_DEMO_PASSWORD', 'demo1234'),
    'register_url' => env('FOODSAAS_REGISTER_URL', 'https://orvae.pe/software/foodsaas'),
];
