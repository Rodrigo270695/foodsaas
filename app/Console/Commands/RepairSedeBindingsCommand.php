<?php

namespace App\Console\Commands;

use App\Models\Sede;
use App\Models\User;
use App\Support\Sedes\SedeAssignment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Repara bindings sede sin borrar datos:
 * - Asigna sede_id nulo en tablas de carta a la sede activa del tenant.
 * - Sincroniza admins a todas las sedes.
 * - Usuarios sin sede → sede única si existe.
 *
 * NUNCA hace DROP / wipe.
 */
class RepairSedeBindingsCommand extends Command
{
    protected $signature = 'foodsaas:repair-sede-bindings
                            {schema? : Schema tenant (ej. rest_pruebas)}
                            {--all : Reparar todos los tenants}';

    protected $description = 'Reasigna sede_id nulos y vínculos usuario↔sede sin borrar datos.';

    /** @var list<string> */
    private const CARTA_TABLES = [
        'cat_categorias',
        'cat_areas',
        'cat_productos',
        'men_cartas',
    ];

    public function handle(): int
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->error('Solo PostgreSQL.');

            return self::FAILURE;
        }

        $schemas = $this->option('all')
            ? DB::table('tenants')
                ->whereNull('deleted_at')
                ->whereNotNull('schema_name')
                ->orderBy('schema_name')
                ->pluck('schema_name')
                ->filter(static fn ($n) => is_string($n) && $n !== '')
                ->values()
                ->all()
            : [trim((string) $this->argument('schema'))];

        $schemas = array_values(array_filter($schemas, static fn (string $s): bool => $s !== ''));

        if ($schemas === []) {
            $this->error('Indica un schema o usa --all.');

            return self::FAILURE;
        }

        foreach ($schemas as $schema) {
            $this->repairSchema($schema);
        }

        return self::SUCCESS;
    }

    private function repairSchema(string $schema): void
    {
        $this->info("Reparando {$schema}…");

        $tenantId = DB::table('public.tenants')->where('schema_name', $schema)->value('id');
        if ($tenantId === null) {
            $this->warn("  Sin tenant para schema {$schema}");

            return;
        }

        $sedeId = DB::table('public.sedes')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->where('activa', true)
            ->orderBy('codigo')
            ->value('id');

        if (! is_string($sedeId) || $sedeId === '') {
            $this->warn('  Sin sede activa; no se puede reasignar carta.');
        }

        $safe = str_replace('"', '', $schema);
        DB::statement('SET search_path TO "'.$safe.'", public');

        try {
            if (is_string($sedeId) && $sedeId !== '') {
                foreach (self::CARTA_TABLES as $table) {
                    if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'sede_id')) {
                        continue;
                    }
                    $nulls = (int) DB::table($table)->whereNull('sede_id')->count();
                    if ($nulls > 0) {
                        DB::table($table)->whereNull('sede_id')->update(['sede_id' => $sedeId]);
                        $this->line("  {$table}: {$nulls} filas → sede {$sedeId}");
                    } else {
                        $this->line("  {$table}: ok (sin nulos)");
                    }
                }
            }

            setPermissionsTeamId((string) $tenantId);

            $admins = User::query()
                ->where('tenant_id', $tenantId)
                ->role('admin_restaurante')
                ->get();

            $allSedeIds = Sede::query()
                ->where('tenant_id', $tenantId)
                ->where('activa', true)
                ->pluck('id')
                ->all();

            foreach ($admins as $admin) {
                $admin->sedes()->sync($allSedeIds);
                $this->line('  admin '.$admin->email.' → '.count($allSedeIds).' sede(s)');
            }

            SedeAssignment::reconcileTenant((string) $tenantId);
            $this->info("  Listo {$schema}");
        } finally {
            DB::statement('SET search_path TO public');
        }
    }
}
