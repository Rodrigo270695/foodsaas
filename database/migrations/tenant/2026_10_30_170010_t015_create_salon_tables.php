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
            if (! Schema::hasTable('cfg_zonas')) {
                Schema::create('cfg_zonas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('sede_id');
                    $table->string('nombre', 120);
                    $table->unsignedInteger('orden')->default(0);
                    $table->boolean('activa')->default(true);
                    $table->timestampsTz();

                    $table->index(['sede_id', 'activa', 'orden'], 'cfg_zonas_sede_activa_orden_index');
                });

                if (Schema::getConnection()->getDriverName() === 'pgsql') {
                    DB::statement(
                        'ALTER TABLE cfg_zonas ADD CONSTRAINT cfg_zonas_sede_fk '
                        .'FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE',
                    );
                }
            }

            if (! Schema::hasTable('cfg_mesas')) {
                Schema::create('cfg_mesas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('sede_id');
                    $table->foreignUuid('zona_id')
                        ->constrained('cfg_zonas')
                        ->cascadeOnDelete();
                    $table->string('codigo', 40);
                    $table->string('nombre', 120)->nullable();
                    $table->unsignedTinyInteger('capacidad')->default(4);
                    $table->boolean('activa')->default(true);
                    $table->timestampsTz();

                    $table->unique(['sede_id', 'codigo'], 'cfg_mesas_sede_codigo_unique');
                    $table->index(['sede_id', 'zona_id', 'activa'], 'cfg_mesas_sede_zona_activa_index');
                });

                if (Schema::getConnection()->getDriverName() === 'pgsql') {
                    DB::statement(
                        'ALTER TABLE cfg_mesas ADD CONSTRAINT cfg_mesas_sede_fk '
                        .'FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE',
                    );
                }
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('cfg_mesas');
            Schema::dropIfExists('cfg_zonas');
        });
    }
};
