<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * CASCADE al borrar una sede borraría carta entera. Pasamos a RESTRICT.
 * No toca filas de datos.
 */
return new class extends TenantMigration
{
    /** @var list<string> */
    private const TABLES = [
        'cat_categorias',
        'cat_areas',
        'cat_productos',
        'men_cartas',
    ];

    public function up(): void
    {
        $this->runInTenant(function (): void {
            foreach (self::TABLES as $table) {
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'sede_id')) {
                    continue;
                }

                $constraint = $table.'_sede_id_foreign';
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraint}");
                DB::statement(
                    "ALTER TABLE {$table}
                     ADD CONSTRAINT {$constraint}
                     FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT",
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            foreach (self::TABLES as $table) {
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'sede_id')) {
                    continue;
                }

                $constraint = $table.'_sede_id_foreign';
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraint}");
                DB::statement(
                    "ALTER TABLE {$table}
                     ADD CONSTRAINT {$constraint}
                     FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE",
                );
            }
        });
    }
};
