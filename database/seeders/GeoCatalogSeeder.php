<?php

namespace Database\Seeders;

use App\Support\Geo\MojibakeFixer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Copia el catálogo geográfico (paises → distritos) desde la BD VetSaaS
 * local hacia FoodSaaS. Idempotente: no duplica filas si ya existen.
 */
class GeoCatalogSeeder extends Seeder
{
    /** @var list<string> */
    private const TABLES = [
        'paises',
        'departamentos',
        'provincias',
        'distritos',
    ];

    public function run(): void
    {
        try {
            DB::connection('vetsaas')->getPdo();
        } catch (\Throwable $e) {
            throw new RuntimeException(
                'No se pudo conectar a la BD VetSaaS (connection vetsaas). '
                .'Configura VETSAAS_DB_* o importa el ubigeo manualmente.',
                previous: $e,
            );
        }

        foreach (self::TABLES as $table) {
            $this->copyTable($table);
        }

        $this->repairEncoding();
    }

    private function copyTable(string $table): void
    {
        if (DB::table($table)->count() > 0) {
            return;
        }

        $rows = DB::connection('vetsaas')->table($table)->orderBy('id')->get();

        if ($rows->isEmpty()) {
            throw new RuntimeException("La tabla vetsaas.{$table} está vacía.");
        }

        foreach ($rows->chunk(200) as $chunk) {
            DB::table($table)->insert(
                $chunk->map(fn ($row) => (array) $row)->all(),
            );
        }
    }

    private function repairEncoding(): void
    {
        foreach (self::TABLES as $table) {
            DB::table($table)
                ->select(['id', 'name'])
                ->orderBy('id')
                ->chunk(500, function ($rows) use ($table): void {
                    foreach ($rows as $row) {
                        $original = (string) $row->name;
                        $repaired = MojibakeFixer::repair($original);

                        if ($repaired !== null && $repaired !== $original) {
                            DB::table($table)->where('id', $row->id)->update(['name' => $repaired]);
                        }
                    }
                });
        }

        DB::table('paises')
            ->where('id', (int) config('geo.default_pais_id', 1))
            ->update(['name' => 'Perú']);
    }
}
