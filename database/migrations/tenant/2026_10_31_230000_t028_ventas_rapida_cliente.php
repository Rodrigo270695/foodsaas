<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('fin_ventas')) {
            return;
        }

        Schema::table('fin_ventas', function (Blueprint $table): void {
            if (! Schema::hasColumn('fin_ventas', 'numero')) {
                $table->string('numero', 40)->nullable()->after('caja_sesion_id');
            }
            if (! Schema::hasColumn('fin_ventas', 'origen')) {
                $table->string('origen', 20)->default('pedido')->after('numero');
            }
            if (! Schema::hasColumn('fin_ventas', 'tipo_comprobante')) {
                $table->string('tipo_comprobante', 20)->default('ticket')->after('origen');
            }
            if (! Schema::hasColumn('fin_ventas', 'cliente_nombre')) {
                $table->string('cliente_nombre', 180)->nullable()->after('tipo_comprobante');
            }
            if (! Schema::hasColumn('fin_ventas', 'cliente_documento')) {
                $table->string('cliente_documento', 20)->nullable()->after('cliente_nombre');
            }
        });

        if (
            Schema::hasColumn('fin_ventas', 'numero')
            && ! Schema::hasIndex('fin_ventas', 'fin_ventas_sede_numero_index')
        ) {
            Schema::table('fin_ventas', function (Blueprint $table): void {
                $table->index(['sede_id', 'numero'], 'fin_ventas_sede_numero_index');
            });
        }

        if (
            Schema::hasColumn('fin_ventas', 'tipo_comprobante')
            && ! Schema::hasIndex('fin_ventas', 'fin_ventas_sede_tipo_index')
        ) {
            Schema::table('fin_ventas', function (Blueprint $table): void {
                $table->index(['sede_id', 'tipo_comprobante'], 'fin_ventas_sede_tipo_index');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('fin_ventas')) {
            return;
        }

        Schema::table('fin_ventas', function (Blueprint $table): void {
            if (Schema::hasIndex('fin_ventas', 'fin_ventas_sede_numero_index')) {
                $table->dropIndex('fin_ventas_sede_numero_index');
            }
            if (Schema::hasIndex('fin_ventas', 'fin_ventas_sede_tipo_index')) {
                $table->dropIndex('fin_ventas_sede_tipo_index');
            }

            foreach ([
                'cliente_documento',
                'cliente_nombre',
                'tipo_comprobante',
                'origen',
                'numero',
            ] as $col) {
                if (Schema::hasColumn('fin_ventas', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
