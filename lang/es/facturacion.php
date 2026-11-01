<?php

return [
    'documentos' => [
        'flash' => [
            'status_synced' => ':numero actualizado: :estado.',
            'status_synced_bulk' => 'Sincronizados :checked comprobantes (:updated actualizados; :pending pendientes, :rejected rechazados).',
        ],
    ],
    'fel' => [
        'apisunat_no_configurado' => 'Configura el token de APISUNAT en Configuración › General.',
        'sandbox_prod' => [
            'solo_emitidos' => 'Solo se pueden pasar a producción comprobantes ya emitidos.',
            'solo_sandbox' => 'Este comprobante ya no está en modo prueba.',
            'restaurante_debe_produccion' => 'Primero cambia APISUNAT a modo Producción en Configuración › General.',
            'sin_pendientes' => 'No hay comprobantes de prueba pendientes en esta serie.',
            'fuera_de_orden' => 'Debes pasar primero :numero (siguiente de la serie :serie).',
            'venta_no_pagada' => 'La venta vinculada debe estar pagada.',
            'ok' => 'Comprobante :numero pasado a producción correctamente.',
        ],
    ],
];
