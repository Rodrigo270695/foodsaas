<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cfg_mesas') || Schema::hasColumn('cfg_mesas', 'union_id')) {
                return;
            }

            Schema::table('cfg_mesas', function (Blueprint $table): void {
                $table->uuid('union_id')->nullable()->after('activa');
                $table->index('union_id', 'cfg_mesas_union_id_index');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cfg_mesas') || ! Schema::hasColumn('cfg_mesas', 'union_id')) {
                return;
            }

            Schema::table('cfg_mesas', function (Blueprint $table): void {
                $table->dropIndex('cfg_mesas_union_id_index');
                $table->dropColumn('union_id');
            });
        });
    }
};
