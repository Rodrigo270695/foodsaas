<?php

namespace App\Console\Commands;

use App\Tenancy\TenantSchemaMigrator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TenantMigrateCommand extends Command
{
    protected $signature = 'foodsaas:tenant-migrate
                            {schema : Nombre del schema PostgreSQL (ej. rest_mi_local)}
                            {--replay : Reinicia el historial de migraciones tenant y vuelve a ejecutarlas}
                            {--wipe : DROP SCHEMA CASCADE + recrear vacío y migrar de nuevo}';

    protected $description = 'Ejecuta database/migrations/tenant en el schema indicado.';

    public function handle(TenantSchemaMigrator $migrator): int
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->error('Solo PostgreSQL soporta multi-schema tenant.');

            return self::FAILURE;
        }

        $code = $migrator->migrate(
            (string) $this->argument('schema'),
            $this->output,
            (bool) $this->option('wipe'),
            (bool) $this->option('replay'),
        );

        return $code === TenantSchemaMigrator::EXIT_SUCCESS ? self::SUCCESS : self::FAILURE;
    }
}
