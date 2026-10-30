<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('fel_series')) {
                return;
            }

            Schema::create('fel_series', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id');
                $table->unsignedTinyInteger('tipo_comprobante');
                $table->string('serie', 4);
                $table->unsignedBigInteger('ultimo_correlativo')->default(0);
                $table->boolean('activo')->default(true);
                $table->timestampsTz();

                $table->unique(['sede_id', 'tipo_comprobante', 'serie'], 'fel_series_sede_tipo_serie_unique');
                $table->index(['sede_id', 'tipo_comprobante', 'activo'], 'fel_series_sede_tipo_activo_index');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement(
                    'ALTER TABLE fel_series ADD CONSTRAINT fel_series_sede_fk '
                    .'FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE',
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('fel_series');
        });
    }
};
