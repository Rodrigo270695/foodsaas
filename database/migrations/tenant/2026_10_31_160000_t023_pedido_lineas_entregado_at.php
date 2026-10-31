<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mesero confirma que llevó el plato a mesa → sale de la campana.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ope_pedido_lineas')) {
            return;
        }

        if (! Schema::hasColumn('ope_pedido_lineas', 'entregado_at')) {
            Schema::table('ope_pedido_lineas', function (Blueprint $table): void {
                $table->timestampTz('entregado_at')->nullable()->after('listo_at');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('ope_pedido_lineas')) {
            return;
        }

        if (Schema::hasColumn('ope_pedido_lineas', 'entregado_at')) {
            Schema::table('ope_pedido_lineas', function (Blueprint $table): void {
                $table->dropColumn('entregado_at');
            });
        }
    }
};
