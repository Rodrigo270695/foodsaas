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
            if (Schema::hasTable('ope_reservas')) {
                return;
            }

            Schema::create('ope_reservas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id')->index();
                $table->uuid('mesa_id')->nullable()->index();
                $table->uuid('cliente_id')->nullable()->index();
                $table->string('cliente_nombre', 180);
                $table->string('cliente_telefono', 40)->nullable();
                $table->unsignedTinyInteger('personas')->default(2);
                $table->timestampTz('reserved_at');
                $table->string('estado', 20)->default('pendiente');
                $table->text('notas')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestampsTz();

                $table->index(['sede_id', 'reserved_at', 'estado'], 'ope_reservas_sede_fecha_estado_index');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement(
                    'ALTER TABLE ope_reservas ADD CONSTRAINT ope_reservas_mesa_fk '
                    .'FOREIGN KEY (mesa_id) REFERENCES cfg_mesas (id) ON DELETE SET NULL',
                );
                DB::statement(
                    'ALTER TABLE ope_reservas ADD CONSTRAINT ope_reservas_cliente_fk '
                    .'FOREIGN KEY (cliente_id) REFERENCES crm_clientes (id) ON DELETE SET NULL',
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('ope_reservas');
        });
    }
};
