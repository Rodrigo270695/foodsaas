<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cat_areas')) {
                Schema::create('cat_areas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->string('nombre', 120);
                    $table->unsignedInteger('orden')->default(0);
                    $table->boolean('activa')->default(true);
                    $table->timestampsTz();

                    $table->unique('nombre', 'cat_areas_nombre_unique');
                    $table->index(['activa', 'orden'], 'cat_areas_activa_orden_index');
                });

                $now = now();
                foreach (
                    [
                        ['nombre' => 'Cocina', 'orden' => 10],
                        ['nombre' => 'Bar', 'orden' => 20],
                        ['nombre' => 'Postres', 'orden' => 30],
                    ] as $area
                ) {
                    DB::table('cat_areas')->insert([
                        'id' => (string) Str::uuid(),
                        'nombre' => $area['nombre'],
                        'orden' => $area['orden'],
                        'activa' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }

            if (Schema::hasTable('cat_productos')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    if (! Schema::hasColumn('cat_productos', 'area_id')) {
                        $table->foreignUuid('area_id')
                            ->nullable()
                            ->after('categoria_id')
                            ->constrained('cat_areas')
                            ->nullOnDelete();
                    }
                    if (! Schema::hasColumn('cat_productos', 'imagen_path')) {
                        $table->string('imagen_path', 500)->nullable()->after('descripcion');
                    }
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('cat_productos')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    if (Schema::hasColumn('cat_productos', 'area_id')) {
                        $table->dropConstrainedForeignId('area_id');
                    }
                    if (Schema::hasColumn('cat_productos', 'imagen_path')) {
                        $table->dropColumn('imagen_path');
                    }
                });
            }

            Schema::dropIfExists('cat_areas');
        });
    }
};
