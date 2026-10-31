<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('fin_caja_sesiones')) {
            return;
        }

        Schema::table('fin_caja_sesiones', function (Blueprint $table): void {
            if (! Schema::hasColumn('fin_caja_sesiones', 'saldos_cierre_json')) {
                $table->json('saldos_cierre_json')->nullable()->after('monto_cierre_contado');
            }
            if (! Schema::hasColumn('fin_caja_sesiones', 'arqueo_json')) {
                $table->json('arqueo_json')->nullable()->after('saldos_cierre_json');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('fin_caja_sesiones')) {
            return;
        }

        Schema::table('fin_caja_sesiones', function (Blueprint $table): void {
            if (Schema::hasColumn('fin_caja_sesiones', 'arqueo_json')) {
                $table->dropColumn('arqueo_json');
            }
            if (Schema::hasColumn('fin_caja_sesiones', 'saldos_cierre_json')) {
                $table->dropColumn('saldos_cierre_json');
            }
        });
    }
};
