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
            $schema = config('tenant.migration_schema');
            $tenantId = is_string($schema) && $schema !== ''
                ? DB::table('public.tenants')->where('schema_name', $schema)->value('id')
                : null;

            $defaultSedeId = null;
            if (is_string($tenantId) || is_int($tenantId)) {
                $defaultSedeId = DB::table('public.sedes')
                    ->where('tenant_id', $tenantId)
                    ->whereNull('deleted_at')
                    ->where('activa', true)
                    ->orderBy('codigo')
                    ->value('id');
            }

            $this->addSedeColumn('cat_categorias', $defaultSedeId);
            $this->addSedeColumn('cat_areas', $defaultSedeId);
            $this->addSedeColumn('cat_productos', $defaultSedeId);
            $this->addSedeColumn('men_cartas', $defaultSedeId);
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            foreach (['men_cartas', 'cat_productos', 'cat_areas', 'cat_categorias'] as $table) {
                if (Schema::hasTable($table) && Schema::hasColumn($table, 'sede_id')) {
                    Schema::table($table, function (Blueprint $blueprint) use ($table): void {
                        $blueprint->dropIndex($table.'_sede_id_index');
                    });
                    Schema::table($table, function (Blueprint $blueprint): void {
                        $blueprint->dropColumn('sede_id');
                    });
                }
            }
        });
    }

    private function addSedeColumn(string $table, mixed $defaultSedeId): void
    {
        if (! Schema::hasTable($table) || Schema::hasColumn($table, 'sede_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint): void {
            $blueprint->uuid('sede_id')->nullable();
        });

        if (is_string($defaultSedeId) && $defaultSedeId !== '') {
            DB::table($table)->whereNull('sede_id')->update(['sede_id' => $defaultSedeId]);
        }

        Schema::table($table, function (Blueprint $blueprint) use ($table): void {
            $blueprint->index('sede_id', $table.'_sede_id_index');
        });

        // FK a public.sedes (mismo patrón que cfg_zonas).
        DB::statement(
            "ALTER TABLE {$table}
             ADD CONSTRAINT {$table}_sede_id_foreign
             FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE",
        );
    }
};
