<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('push_subscriptions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE push_subscriptions ALTER COLUMN endpoint TYPE VARCHAR(2048)');

            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE push_subscriptions MODIFY endpoint VARCHAR(2048) NOT NULL');

            return;
        }

        // sqlite: recrear no hace falta si la tabla es nueva con 2048; ignore.
    }

    public function down(): void
    {
        // no-op
    }
};
