<?php

namespace App\Console\Commands;

use App\Tenancy\TenantSchemaMigrator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TenantMigrateCommand extends Command
{
    protected $signature = 'foodsaas:tenant-migrate
                            {schema? : Nombre del schema PostgreSQL (ej. rest_mi_local)}
                            {--all : Migrar todos los schemas de tenants}
                            {--replay : Reinicia el historial de migraciones tenant y vuelve a ejecutarlas}
                            {--wipe : DROP SCHEMA CASCADE + recrear vacío y migrar de nuevo}';

    protected $description = 'Ejecuta database/migrations/tenant en el schema indicado.';

    public function handle(TenantSchemaMigrator $migrator): int
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->error('Solo PostgreSQL soporta multi-schema tenant.');

            return self::FAILURE;
        }

        $schemas = $this->option('all')
            ? $this->tenantSchemas()
            : [trim((string) $this->argument('schema'))];

        $schemas = array_values(array_filter($schemas, static fn (string $schema): bool => $schema !== ''));

        if ($schemas === []) {
            if ($this->option('all')) {
                $this->warn('No hay tenants con schema_name para migrar.');

                return self::SUCCESS;
            }

            $this->error('Indica un schema o usa --all.');

            return self::FAILURE;
        }

        $wipe = (bool) $this->option('wipe');
        $replay = (bool) $this->option('replay');

        if ($wipe) {
            $this->error('PELIGRO: --wipe hace DROP SCHEMA CASCADE y borra TODOS los datos del tenant.');
            $this->warn('En producción esto es irreversible sin backup.');

            if (app()->environment('production')) {
                $this->error('Bloqueado en production. Restaura desde backup; no uses --wipe aquí.');

                return self::FAILURE;
            }

            if (! $this->confirm('¿Confirmas borrar y recrear el/los schema(s) '.implode(', ', $schemas).'?', false)) {
                $this->info('Cancelado. No se borró nada.');

                return self::SUCCESS;
            }
        }

        if ($replay && ! $wipe) {
            $this->warn('--replay re-ejecuta migraciones tenant. Preferible solo en local y sin datos críticos.');
            if (! $this->confirm('¿Continuar con --replay?', false)) {
                $this->info('Cancelado.');

                return self::SUCCESS;
            }
        }

        $failed = 0;

        foreach ($schemas as $schema) {
            $this->info('Migrando '.$schema.'…');
            $code = $migrator->migrate(
                $schema,
                $this->output,
                $wipe,
                $replay,
            );

            if ($code !== TenantSchemaMigrator::EXIT_SUCCESS) {
                $failed++;
            }
        }

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }

    /**
     * @return list<string>
     */
    private function tenantSchemas(): array
    {
        return DB::table('tenants')
            ->whereNull('deleted_at')
            ->whereNotNull('schema_name')
            ->orderBy('schema_name')
            ->pluck('schema_name')
            ->filter(static fn (mixed $name): bool => is_string($name) && $name !== '')
            ->values()
            ->all();
    }
}
