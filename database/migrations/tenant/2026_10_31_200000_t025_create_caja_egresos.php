<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fin_caja_egresos')) {
            return;
        }

        Schema::create('fin_caja_egresos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('caja_sesion_id')
                ->constrained('fin_caja_sesiones')
                ->cascadeOnDelete();
            $table->decimal('monto', 14, 2);
            $table->string('medio', 30)->default('efectivo');
            $table->string('motivo', 40);
            $table->text('notas')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestampsTz();

            $table->index(['caja_sesion_id', 'created_at'], 'fin_caja_egresos_sesion_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fin_caja_egresos');
    }
};
