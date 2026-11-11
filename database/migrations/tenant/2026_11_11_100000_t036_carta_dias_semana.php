<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('men_cartas')) {
                return;
            }

            Schema::table('men_cartas', function (Blueprint $table): void {
                if (! Schema::hasColumn('men_cartas', 'dias_semana')) {
                    $table->json('dias_semana')->nullable()->after('vigente_hasta');
                }
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('men_cartas') || ! Schema::hasColumn('men_cartas', 'dias_semana')) {
                return;
            }

            Schema::table('men_cartas', function (Blueprint $table): void {
                $table->dropColumn('dias_semana');
            });
        });
    }
};
