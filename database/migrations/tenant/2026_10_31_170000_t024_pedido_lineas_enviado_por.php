<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Quién envió el ítem a cocina (mesero dueño de la notificación / entrega).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ope_pedido_lineas')) {
            return;
        }

        if (! Schema::hasColumn('ope_pedido_lineas', 'enviado_por')) {
            Schema::table('ope_pedido_lineas', function (Blueprint $table): void {
                $table->unsignedBigInteger('enviado_por')->nullable()->after('enviado_at');
                $table->index('enviado_por', 'ope_pedido_lineas_enviado_por_index');
            });
        }

        // Backfill: líneas ya enviadas → dueño = quien abrió el pedido.
        if (Schema::hasTable('ope_pedidos') && Schema::hasColumn('ope_pedido_lineas', 'enviado_por')) {
            DB::statement('
                UPDATE ope_pedido_lineas AS l
                SET enviado_por = p.opened_by
                FROM ope_pedidos AS p
                WHERE l.pedido_id = p.id
                  AND l.enviado_por IS NULL
                  AND l.enviado_at IS NOT NULL
                  AND p.opened_by IS NOT NULL
            ');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('ope_pedido_lineas')) {
            return;
        }

        if (Schema::hasColumn('ope_pedido_lineas', 'enviado_por')) {
            Schema::table('ope_pedido_lineas', function (Blueprint $table): void {
                $table->dropIndex('ope_pedido_lineas_enviado_por_index');
                $table->dropColumn('enviado_por');
            });
        }
    }
};
