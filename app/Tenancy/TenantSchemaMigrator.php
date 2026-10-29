<?php

namespace App\Tenancy;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\Console\Output\OutputInterface;

class TenantSchemaMigrator
{
    public const EXIT_SUCCESS = 0;

    public const EXIT_FAILURE = 1;

    public function migrate(
        string $schema,
        OutputInterface $output,
        bool $wipe = false,
        bool $replay = false,
    ): int {
        if (! preg_match('/^[a-z_][a-z0-9_]{0,62}$/i', $schema)) {
            $output->writeln('<error>Nombre de schema inválido: '.$schema.'</error>');

            return self::EXIT_FAILURE;
        }

        if (DB::getDriverName() !== 'pgsql') {
            $output->writeln('<error>Solo está soportado PostgreSQL para multi-schema tenant.</error>');

            return self::EXIT_FAILURE;
        }

        $safe = str_replace('"', '', $schema);

        DB::statement('CREATE SCHEMA IF NOT EXISTS "'.$safe.'"');

        if ($wipe) {
            DB::statement('DROP SCHEMA IF EXISTS "'.$safe.'" CASCADE');
            DB::statement('CREATE SCHEMA "'.$safe.'"');
            $output->writeln('<info>Schema recreado vacío (wipe): '.$safe.'</info>');
        }

        $tenantMigrationNames = $this->tenantMigrationBasenames();

        if (($replay || $wipe) && $tenantMigrationNames !== []) {
            foreach ($tenantMigrationNames as $name) {
                DB::delete('delete from public.migrations where migration = ?', [$name]);
            }
            DB::statement('SET search_path TO "'.$safe.'", public');
            try {
                if (Schema::hasTable('migrations')) {
                    DB::table('migrations')->whereIn('migration', $tenantMigrationNames)->delete();
                }
            } finally {
                DB::statement('SET search_path TO public');
            }
            $output->writeln('<info>Historial de migraciones tenant reiniciado (replay/wipe).</info>');
        }

        config(['tenant.migration_schema' => $schema]);

        DB::statement('SET search_path TO "'.$safe.'", public');

        try {
            $this->ensureTenantMigrationsTableExists();
            $this->bootstrapMigrationRowsFromExistingTables($output);

            $exitCode = Artisan::call('migrate', [
                '--path' => 'database/migrations/tenant',
                '--force' => true,
            ]);
            $output->write(Artisan::output());

            if ($exitCode !== 0) {
                $output->writeln('<error>migrate terminó con código '.$exitCode.'</error>');

                return self::EXIT_FAILURE;
            }

            $this->purgePublicTenantMigrationRows($tenantMigrationNames);
        } catch (\Throwable $e) {
            $output->writeln('<error>'.$e->getMessage().'</error>');
            $previous = $e->getPrevious();
            if ($previous instanceof \Throwable) {
                $output->writeln('<error>Causa: '.$previous->getMessage().'</error>');
            }

            return self::EXIT_FAILURE;
        } finally {
            $this->resetConnectionAfterMigrate();
            config(['tenant.migration_schema' => null]);
        }

        $output->writeln('<info>Schema listo: '.$safe.'</info>');

        return self::EXIT_SUCCESS;
    }

    /**
     * @return list<string>
     */
    private function tenantMigrationBasenames(): array
    {
        $paths = glob(database_path('migrations/tenant/*.php')) ?: [];

        return collect($paths)
            ->map(fn (string $path): string => pathinfo($path, PATHINFO_FILENAME))
            ->sort()
            ->values()
            ->all();
    }

    private function ensureTenantMigrationsTableExists(): void
    {
        if (Schema::hasTable('migrations')) {
            return;
        }

        Schema::create('migrations', function (Blueprint $table) {
            $table->increments('id');
            $table->string('migration');
            $table->integer('batch');
        });
    }

    private function bootstrapMigrationRowsFromExistingTables(OutputInterface $output): void
    {
        $names = $this->tenantMigrationBasenames();
        if ($names === []) {
            return;
        }

        $batch = max(1, (int) DB::table('migrations')->max('batch'));
        $inserted = 0;

        foreach ($names as $migration) {
            if (DB::table('migrations')->where('migration', $migration)->exists()) {
                continue;
            }

            if (! $this->tenantMigrationIsMaterialized($migration)) {
                continue;
            }

            DB::table('migrations')->insert([
                'migration' => $migration,
                'batch' => $batch,
            ]);
            $inserted++;
        }

        if ($inserted > 0) {
            $output->writeln('<info>Bootstrap: '.$inserted.' migración(es) tenant marcadas como ya aplicadas.</info>');
        }
    }

    private function tenantMigrationIsMaterialized(string $migration): bool
    {
        return match ($migration) {
            '2026_10_29_200010_t010_create_cfg_restaurant_settings_table' => Schema::hasTable('cfg_restaurant_settings'),
            default => false,
        };
    }

    private function resetConnectionAfterMigrate(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }

        try {
            DB::statement('ROLLBACK');
        } catch (\Throwable) {
            // Sin transacción abierta en el servidor.
        }

        DB::reconnect();
        DB::statement('SET search_path TO public');
    }

    /**
     * @param  list<string>  $tenantMigrationNames
     */
    private function purgePublicTenantMigrationRows(array $tenantMigrationNames): void
    {
        if ($tenantMigrationNames === []) {
            return;
        }

        foreach ($tenantMigrationNames as $name) {
            DB::delete('delete from public.migrations where migration = ?', [$name]);
        }
    }
}
