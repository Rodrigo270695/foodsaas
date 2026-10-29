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
            Schema::create('cfg_restaurant_settings', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('ruc', 11)->nullable();
                $table->string('razon_social', 200)->nullable();
                $table->string('nombre_comercial', 150)->nullable();
                $table->string('direccion', 255)->nullable();
                $table->unsignedBigInteger('distrito_id')->nullable();
                $table->string('email_operaciones', 150)->nullable();
                $table->string('telefono', 20)->nullable();
                $table->string('timezone', 50)->default('America/Lima');
                $table->string('locale', 10)->default('es_PE');
                $table->char('moneda', 3)->default('PEN');
                $table->decimal('igv_porcentaje', 5, 2)->default(18);
                $table->boolean('precio_incluye_igv')->default(true);
                $table->string('color_primario', 7)->nullable();
                $table->timestampsTz();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement(
                    'ALTER TABLE cfg_restaurant_settings ADD CONSTRAINT cfg_restaurant_settings_distrito_fk '
                    .'FOREIGN KEY (distrito_id) REFERENCES public.distritos (id) ON DELETE SET NULL',
                );
                DB::statement(
                    'CREATE UNIQUE INDEX uq_cfg_restaurant_settings_single_row ON cfg_restaurant_settings ((TRUE))',
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('cfg_restaurant_settings');
        });
    }
};
