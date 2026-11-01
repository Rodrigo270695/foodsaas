<?php

return [
    'documentos' => [
        'flash' => [
            'status_synced' => ':numero updated: :estado.',
            'status_synced_bulk' => 'Synced :checked receipts (:updated updated; :pending pending, :rejected rejected).',
        ],
    ],
    'fel' => [
        'apisunat_no_configurado' => 'Set up the APISUNAT token in Settings › General.',
        'sandbox_prod' => [
            'solo_emitidos' => 'Only already issued receipts can be moved to production.',
            'solo_sandbox' => 'This receipt is no longer in test mode.',
            'restaurante_debe_produccion' => 'First switch APISUNAT to Production mode in Settings › General.',
            'sin_pendientes' => 'There are no pending test receipts in this series.',
            'fuera_de_orden' => 'You must first convert :numero (next in series :serie).',
            'venta_no_pagada' => 'The linked sale must be paid.',
            'ok' => 'Receipt :numero moved to production successfully.',
        ],
    ],
];
