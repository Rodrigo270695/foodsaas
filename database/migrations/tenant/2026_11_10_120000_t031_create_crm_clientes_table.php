<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('crm_clientes')) {
                return;
            }

            Schema::create('crm_clientes', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id')->nullable()->index();
                $table->string('nombre', 180);
                $table->string('documento', 20)->nullable();
                $table->string('telefono', 40)->nullable();
                $table->string('email', 180)->nullable();
                $table->text('notas')->nullable();
                $table->timestampsTz();

                $table->unique('documento', 'crm_clientes_documento_unique');
                $table->index(['nombre'], 'crm_clientes_nombre_index');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('crm_clientes');
        });
    }
};
