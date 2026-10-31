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
            if (! Schema::hasColumn('fin_caja_sesiones', 'moneda')) {
                $table->string('moneda', 3)->default('PEN')->after('estado');
            }
            if (! Schema::hasColumn('fin_caja_sesiones', 'saldos_apertura_json')) {
                $table->json('saldos_apertura_json')->nullable()->after('monto_apertura');
            }
            if (! Schema::hasColumn('fin_caja_sesiones', 'notas_apertura')) {
                $table->text('notas_apertura')->nullable()->after('saldos_apertura_json');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('fin_caja_sesiones')) {
            return;
        }

        Schema::table('fin_caja_sesiones', function (Blueprint $table): void {
            if (Schema::hasColumn('fin_caja_sesiones', 'notas_apertura')) {
                $table->dropColumn('notas_apertura');
            }
            if (Schema::hasColumn('fin_caja_sesiones', 'saldos_apertura_json')) {
                $table->dropColumn('saldos_apertura_json');
            }
            if (Schema::hasColumn('fin_caja_sesiones', 'moneda')) {
                $table->dropColumn('moneda');
            }
        });
    }
};
