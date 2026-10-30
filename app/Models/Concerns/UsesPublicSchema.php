<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Fuerza consultas al schema `public` aunque el tenant haya fijado search_path.
 */
trait UsesPublicSchema
{
    public function getTable(): string
    {
        $table = parent::getTable();

        if (DB::getDriverName() === 'pgsql' && ! str_contains($table, '.')) {
            return 'public.'.$table;
        }

        return $table;
    }
}
