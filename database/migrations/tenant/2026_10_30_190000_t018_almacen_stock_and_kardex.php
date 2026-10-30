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
            if (Schema::hasTable('cat_productos')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    if (! Schema::hasColumn('cat_productos', 'control_inventario')) {
                        $table->string('control_inventario', 20)
                            ->default('none')
                            ->after('activo');
                    }
                    if (! Schema::hasColumn('cat_productos', 'stock')) {
                        $table->decimal('stock', 14, 3)->nullable()->after('control_inventario');
                    }
                    if (! Schema::hasColumn('cat_productos', 'stock_minimo')) {
                        $table->decimal('stock_minimo', 14, 3)->nullable()->after('stock');
                    }
                });

                if (! $this->hasIndex('cat_productos', 'cat_productos_control_stock_index')) {
                    Schema::table('cat_productos', function (Blueprint $table): void {
                        $table->index(
                            ['control_inventario', 'stock'],
                            'cat_productos_control_stock_index',
                        );
                    });
                }
            }

            if (! Schema::hasTable('inv_movimientos')) {
                Schema::create('inv_movimientos', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('producto_id')
                        ->constrained('cat_productos')
                        ->cascadeOnDelete();
                    $table->string('tipo', 20);
                    $table->decimal('cantidad', 14, 3);
                    $table->decimal('stock_anterior', 14, 3);
                    $table->decimal('stock_despues', 14, 3);
                    $table->string('motivo', 255)->nullable();
                    $table->string('referencia_tipo', 40)->nullable();
                    $table->string('referencia_id', 64)->nullable();
                    $table->unsignedBigInteger('user_id')->nullable();
                    $table->timestampsTz();

                    $table->index(['producto_id', 'created_at'], 'inv_movimientos_producto_fecha_index');
                    $table->index(['tipo', 'created_at'], 'inv_movimientos_tipo_fecha_index');
                });

                DB::statement(
                    'ALTER TABLE inv_movimientos
                     ADD CONSTRAINT inv_movimientos_user_id_foreign
                     FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL',
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('inv_movimientos');

            if (Schema::hasTable('cat_productos')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    if (Schema::hasColumn('cat_productos', 'stock_minimo')) {
                        $table->dropColumn('stock_minimo');
                    }
                    if (Schema::hasColumn('cat_productos', 'stock')) {
                        $table->dropColumn('stock');
                    }
                    if (Schema::hasColumn('cat_productos', 'control_inventario')) {
                        $table->dropColumn('control_inventario');
                    }
                });
            }
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
};
