<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sedes') && ! Schema::hasColumn('sedes', 'horario_atencion')) {
            Schema::table('sedes', function (Blueprint $table): void {
                $table->json('horario_atencion')->nullable()->after('activa');
            });
        }

        if (! Schema::hasTable('sede_user')) {
            Schema::create('sede_user', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignUuid('sede_id')->constrained('sedes')->cascadeOnDelete();
                $table->timestampsTz();

                $table->unique(['user_id', 'sede_id']);
                $table->index('sede_id');
            });
        }

        $this->backfillSoleSedeUsers();
    }

    public function down(): void
    {
        Schema::dropIfExists('sede_user');

        if (Schema::hasTable('sedes') && Schema::hasColumn('sedes', 'horario_atencion')) {
            Schema::table('sedes', function (Blueprint $table): void {
                $table->dropColumn('horario_atencion');
            });
        }
    }

    /**
     * Si el restaurante tiene una sola sede, todos sus usuarios quedan asignados a ella.
     */
    private function backfillSoleSedeUsers(): void
    {
        if (! Schema::hasTable('sede_user') || ! Schema::hasTable('sedes') || ! Schema::hasTable('users')) {
            return;
        }

        $now = now();
        $tenantIds = DB::table('sedes')
            ->whereNull('deleted_at')
            ->select('tenant_id')
            ->groupBy('tenant_id')
            ->havingRaw('count(*) = 1')
            ->pluck('tenant_id');

        foreach ($tenantIds as $tenantId) {
            $sedeId = DB::table('sedes')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->value('id');

            if (! is_string($sedeId) || $sedeId === '') {
                continue;
            }

            $userIds = DB::table('users')
                ->where('tenant_id', $tenantId)
                ->pluck('id');

            foreach ($userIds as $userId) {
                DB::table('sede_user')->insertOrIgnore([
                    'user_id' => $userId,
                    'sede_id' => $sedeId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
};
