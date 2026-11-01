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
            if (! Schema::hasTable('fin_ventas')) {
                return;
            }

            Schema::table('fin_ventas', function (Blueprint $table): void {
                if (! Schema::hasColumn('fin_ventas', 'anulado_at')) {
                    $table->timestampTz('anulado_at')->nullable()->after('created_by');
                }
                if (! Schema::hasColumn('fin_ventas', 'anulado_por_id')) {
                    $table->unsignedBigInteger('anulado_por_id')->nullable()->after('anulado_at');
                }
                if (! Schema::hasColumn('fin_ventas', 'motivo_anulacion')) {
                    $table->text('motivo_anulacion')->nullable()->after('anulado_por_id');
                }
            });

            try {
                Schema::table('fin_ventas', function (Blueprint $table): void {
                    $table->index('anulado_at');
                });
            } catch (\Throwable) {
            }

            if (Schema::hasColumn('fin_ventas', 'anulado_por_id')) {
                try {
                    DB::statement(
                        'ALTER TABLE fin_ventas ADD CONSTRAINT fin_ventas_anulado_por_id_fk '
                        .'FOREIGN KEY (anulado_por_id) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                } catch (\Throwable) {
                }
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('fin_ventas')) {
                return;
            }

            try {
                DB::statement('ALTER TABLE fin_ventas DROP CONSTRAINT IF EXISTS fin_ventas_anulado_por_id_fk');
            } catch (\Throwable) {
            }

            Schema::table('fin_ventas', function (Blueprint $table): void {
                if (Schema::hasColumn('fin_ventas', 'anulado_por_id')) {
                    $table->dropColumn('anulado_por_id');
                }
                if (Schema::hasColumn('fin_ventas', 'motivo_anulacion')) {
                    $table->dropColumn('motivo_anulacion');
                }
                if (Schema::hasColumn('fin_ventas', 'anulado_at')) {
                    try {
                        $table->dropIndex(['anulado_at']);
                    } catch (\Throwable) {
                    }
                    $table->dropColumn('anulado_at');
                }
            });
        });
    }
};
