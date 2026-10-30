<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cfg_restaurant_settings')) {
                return;
            }

            Schema::table('cfg_restaurant_settings', function (Blueprint $table): void {
                if (! Schema::hasColumn('cfg_restaurant_settings', 'apisunat_token_enc')) {
                    $table->text('apisunat_token_enc')->nullable();
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'apisunat_mode')) {
                    $table->string('apisunat_mode', 20)->default('sandbox');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'apisunat_configurado')) {
                    $table->boolean('apisunat_configurado')->default(false);
                }
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cfg_restaurant_settings')) {
                return;
            }

            $columns = array_values(array_filter(
                ['apisunat_token_enc', 'apisunat_mode', 'apisunat_configurado'],
                fn (string $column): bool => Schema::hasColumn('cfg_restaurant_settings', $column),
            ));

            if ($columns === []) {
                return;
            }

            Schema::table('cfg_restaurant_settings', function (Blueprint $table) use ($columns): void {
                $table->dropColumn($columns);
            });
        });
    }
};
