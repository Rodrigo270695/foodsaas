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
            if (! Schema::hasTable('cfg_restaurant_settings')) {
                return;
            }

            Schema::table('cfg_restaurant_settings', function (Blueprint $table): void {
                if (! Schema::hasColumn('cfg_restaurant_settings', 'logo_path')) {
                    $table->string('logo_path', 255)->nullable()->after('nombre_comercial');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'sitio_web')) {
                    $table->string('sitio_web', 200)->nullable()->after('telefono');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'igv_afectacion')) {
                    $table->string('igv_afectacion', 20)->default('gravado')->after('igv_porcentaje');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'igv_alimentos_porcentaje')) {
                    $table->decimal('igv_alimentos_porcentaje', 5, 2)->default(18)->after('igv_afectacion');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'ticket_ancho_mm')) {
                    $table->string('ticket_ancho_mm', 2)->default('80')->after('precio_incluye_igv');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'emite_comprobantes_sunat')) {
                    $table->boolean('emite_comprobantes_sunat')->default(false)->after('ticket_ancho_mm');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'horario_atencion')) {
                    $table->json('horario_atencion')->nullable()->after('emite_comprobantes_sunat');
                }
                if (! Schema::hasColumn('cfg_restaurant_settings', 'updated_by_id')) {
                    $table->unsignedBigInteger('updated_by_id')->nullable()->after('updated_at');
                }
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql' && Schema::hasColumn('cfg_restaurant_settings', 'updated_by_id')) {
                DB::statement(
                    'ALTER TABLE cfg_restaurant_settings DROP CONSTRAINT IF EXISTS cfg_restaurant_settings_updated_by_fk',
                );
                DB::statement(
                    'ALTER TABLE cfg_restaurant_settings ADD CONSTRAINT cfg_restaurant_settings_updated_by_fk '
                    .'FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL',
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cfg_restaurant_settings')) {
                return;
            }

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement(
                    'ALTER TABLE cfg_restaurant_settings DROP CONSTRAINT IF EXISTS cfg_restaurant_settings_updated_by_fk',
                );
            }

            Schema::table('cfg_restaurant_settings', function (Blueprint $table): void {
                foreach ([
                    'logo_path',
                    'sitio_web',
                    'igv_afectacion',
                    'igv_alimentos_porcentaje',
                    'ticket_ancho_mm',
                    'emite_comprobantes_sunat',
                    'horario_atencion',
                    'updated_by_id',
                ] as $column) {
                    if (Schema::hasColumn('cfg_restaurant_settings', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        });
    }
};
