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
            if (! Schema::hasTable('inv_insumos')) {
                Schema::create('inv_insumos', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('sede_id')
                        ->nullable()
                        ->constrained('sedes')
                        ->nullOnDelete();
                    $table->string('nombre', 180);
                    $table->string('unidad', 20)->default('und');
                    $table->decimal('stock', 14, 3)->default(0);
                    $table->decimal('stock_minimo', 14, 3)->nullable();
                    $table->decimal('costo_unitario', 14, 4)->default(0);
                    $table->boolean('activo')->default(true);
                    $table->timestampsTz();

                    $table->index(['sede_id', 'activo'], 'inv_insumos_sede_activo_index');
                    $table->index(['nombre'], 'inv_insumos_nombre_index');
                });
            }

            if (! Schema::hasTable('inv_recetas')) {
                Schema::create('inv_recetas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('producto_id')
                        ->unique()
                        ->constrained('cat_productos')
                        ->cascadeOnDelete();
                    $table->string('notas', 500)->nullable();
                    $table->timestampsTz();
                });
            }

            if (! Schema::hasTable('inv_receta_lineas')) {
                Schema::create('inv_receta_lineas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('receta_id')
                        ->constrained('inv_recetas')
                        ->cascadeOnDelete();
                    $table->foreignUuid('insumo_id')
                        ->constrained('inv_insumos')
                        ->restrictOnDelete();
                    $table->decimal('cantidad', 14, 3);
                    $table->timestampsTz();

                    $table->unique(['receta_id', 'insumo_id'], 'inv_receta_lineas_receta_insumo_unique');
                });
            }

            if (Schema::hasTable('inv_movimientos')) {
                Schema::table('inv_movimientos', function (Blueprint $table): void {
                    if (! Schema::hasColumn('inv_movimientos', 'insumo_id')) {
                        $table->uuid('insumo_id')->nullable()->after('producto_id');
                    }
                    if (! Schema::hasColumn('inv_movimientos', 'costo_unitario')) {
                        $table->decimal('costo_unitario', 14, 4)->nullable()->after('stock_despues');
                    }
                    if (! Schema::hasColumn('inv_movimientos', 'costo_total')) {
                        $table->decimal('costo_total', 14, 4)->nullable()->after('costo_unitario');
                    }
                });

                // producto_id pasa a nullable (movimientos de insumo).
                DB::statement(
                    'ALTER TABLE inv_movimientos ALTER COLUMN producto_id DROP NOT NULL',
                );

                if (! $this->hasConstraint('inv_movimientos', 'inv_movimientos_insumo_id_foreign')) {
                    DB::statement(
                        'ALTER TABLE inv_movimientos
                         ADD CONSTRAINT inv_movimientos_insumo_id_foreign
                         FOREIGN KEY (insumo_id) REFERENCES inv_insumos (id) ON DELETE CASCADE',
                    );
                }

                if (! $this->hasIndex('inv_movimientos', 'inv_movimientos_insumo_fecha_index')) {
                    Schema::table('inv_movimientos', function (Blueprint $table): void {
                        $table->index(
                            ['insumo_id', 'created_at'],
                            'inv_movimientos_insumo_fecha_index',
                        );
                    });
                }

                if (! $this->hasConstraint('inv_movimientos', 'inv_movimientos_producto_o_insumo_chk')) {
                    DB::statement(
                        'ALTER TABLE inv_movimientos
                         ADD CONSTRAINT inv_movimientos_producto_o_insumo_chk
                         CHECK (
                             (producto_id IS NOT NULL AND insumo_id IS NULL)
                             OR (producto_id IS NULL AND insumo_id IS NOT NULL)
                         )',
                    );
                }
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('inv_movimientos')) {
                if ($this->hasConstraint('inv_movimientos', 'inv_movimientos_producto_o_insumo_chk')) {
                    DB::statement(
                        'ALTER TABLE inv_movimientos DROP CONSTRAINT inv_movimientos_producto_o_insumo_chk',
                    );
                }
                if ($this->hasConstraint('inv_movimientos', 'inv_movimientos_insumo_id_foreign')) {
                    DB::statement(
                        'ALTER TABLE inv_movimientos DROP CONSTRAINT inv_movimientos_insumo_id_foreign',
                    );
                }

                Schema::table('inv_movimientos', function (Blueprint $table): void {
                    if (Schema::hasColumn('inv_movimientos', 'costo_total')) {
                        $table->dropColumn('costo_total');
                    }
                    if (Schema::hasColumn('inv_movimientos', 'costo_unitario')) {
                        $table->dropColumn('costo_unitario');
                    }
                    if (Schema::hasColumn('inv_movimientos', 'insumo_id')) {
                        $table->dropColumn('insumo_id');
                    }
                });

                DB::statement(
                    'ALTER TABLE inv_movimientos ALTER COLUMN producto_id SET NOT NULL',
                );
            }

            Schema::dropIfExists('inv_receta_lineas');
            Schema::dropIfExists('inv_recetas');
            Schema::dropIfExists('inv_insumos');
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        $schema = config('tenant.migration_schema');
        if (! is_string($schema) || $schema === '') {
            return false;
        }

        $row = DB::selectOne(
            'SELECT 1 AS ok
             FROM pg_indexes
             WHERE schemaname = ? AND tablename = ? AND indexname = ?
             LIMIT 1',
            [$schema, $table, $index],
        );

        return $row !== null;
    }

    private function hasConstraint(string $table, string $constraint): bool
    {
        $schema = config('tenant.migration_schema');
        if (! is_string($schema) || $schema === '') {
            return false;
        }

        $row = DB::selectOne(
            'SELECT 1 AS ok
             FROM pg_constraint c
             JOIN pg_class t ON c.conrelid = t.oid
             JOIN pg_namespace n ON t.relnamespace = n.oid
             WHERE n.nspname = ? AND t.relname = ? AND c.conname = ?
             LIMIT 1',
            [$schema, $table, $constraint],
        );

        return $row !== null;
    }
};
