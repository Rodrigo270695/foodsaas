<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('crm_clientes') || Schema::hasColumn('crm_clientes', 'documento_tipo')) {
                return;
            }

            Schema::table('crm_clientes', function (Blueprint $table): void {
                $table->string('documento_tipo', 10)->nullable()->after('nombre');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('crm_clientes') || ! Schema::hasColumn('crm_clientes', 'documento_tipo')) {
                return;
            }

            Schema::table('crm_clientes', function (Blueprint $table): void {
                $table->dropColumn('documento_tipo');
            });
        });
    }
};
