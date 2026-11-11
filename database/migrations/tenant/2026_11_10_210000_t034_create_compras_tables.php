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
            if (! Schema::hasTable('log_proveedores')) {
                Schema::create('log_proveedores', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('sede_id')
                        ->nullable()
                        ->constrained('sedes')
                        ->nullOnDelete();
                    $table->string('nombre', 180);
                    $table->string('ruc', 11)->nullable();
                    $table->string('telefono', 40)->nullable();
                    $table->string('email', 180)->nullable();
                    $table->string('notas', 500)->nullable();
                    $table->boolean('activo')->default(true);
                    $table->timestampsTz();

                    $table->index(['sede_id', 'activo'], 'log_proveedores_sede_activo_index');
                    $table->index(['nombre'], 'log_proveedores_nombre_index');
                });
            }

            if (! Schema::hasTable('log_compras')) {
                Schema::create('log_compras', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('sede_id')
                        ->constrained('sedes')
                        ->cascadeOnDelete();
                    $table->foreignUuid('proveedor_id')
                        ->nullable()
                        ->constrained('log_proveedores')
                        ->nullOnDelete();
                    $table->unsignedInteger('numero');
                    $table->string('estado', 20)->default('borrador');
                    $table->date('fecha');
                    $table->string('notas', 500)->nullable();
                    $table->decimal('total', 14, 2)->default(0);
                    $table->unsignedBigInteger('user_id')->nullable();
                    $table->timestampsTz();

                    $table->unique(['sede_id', 'numero'], 'log_compras_sede_numero_unique');
                    $table->index(['sede_id', 'estado'], 'log_compras_sede_estado_index');
                    $table->index(['sede_id', 'fecha'], 'log_compras_sede_fecha_index');
                });

                if (! $this->hasConstraint('log_compras', 'log_compras_user_id_foreign')) {
                    DB::statement(
                        'ALTER TABLE log_compras
                         ADD CONSTRAINT log_compras_user_id_foreign
                         FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                }
            }

            if (! Schema::hasTable('log_compra_lineas')) {
                Schema::create('log_compra_lineas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('compra_id')
                        ->constrained('log_compras')
                        ->cascadeOnDelete();
                    $table->string('linea_tipo', 20);
                    $table->foreignUuid('insumo_id')
                        ->nullable()
                        ->constrained('inv_insumos')
                        ->restrictOnDelete();
                    $table->foreignUuid('producto_id')
                        ->nullable()
                        ->constrained('cat_productos')
                        ->restrictOnDelete();
                    $table->decimal('cantidad', 14, 3);
                    $table->decimal('cantidad_recibida', 14, 3)->default(0);
                    $table->decimal('costo_unitario', 14, 4)->default(0);
                    $table->string('unidad', 20)->default('und');
                    $table->timestampsTz();

                    $table->index(['compra_id'], 'log_compra_lineas_compra_index');
                });

                if (! $this->hasConstraint('log_compra_lineas', 'log_compra_lineas_tipo_fk_chk')) {
                    DB::statement(
                        "ALTER TABLE log_compra_lineas
                         ADD CONSTRAINT log_compra_lineas_tipo_fk_chk
                         CHECK (
                             (linea_tipo = 'insumo' AND insumo_id IS NOT NULL AND producto_id IS NULL)
                             OR (linea_tipo = 'producto' AND producto_id IS NOT NULL AND insumo_id IS NULL)
                         )",
                    );
                }
            }

            if (Schema::hasTable('cat_productos') && ! Schema::hasColumn('cat_productos', 'costo_unitario')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    $table->decimal('costo_unitario', 14, 4)->default(0)->after('stock_minimo');
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('log_compra_lineas')) {
                if ($this->hasConstraint('log_compra_lineas', 'log_compra_lineas_tipo_fk_chk')) {
                    DB::statement(
                        'ALTER TABLE log_compra_lineas DROP CONSTRAINT log_compra_lineas_tipo_fk_chk',
                    );
                }
            }

            Schema::dropIfExists('log_compra_lineas');

            if (Schema::hasTable('log_compras')) {
                if ($this->hasConstraint('log_compras', 'log_compras_user_id_foreign')) {
                    DB::statement(
                        'ALTER TABLE log_compras DROP CONSTRAINT log_compras_user_id_foreign',
                    );
                }
            }
            Schema::dropIfExists('log_compras');
            Schema::dropIfExists('log_proveedores');

            if (Schema::hasTable('cat_productos') && Schema::hasColumn('cat_productos', 'costo_unitario')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    $table->dropColumn('costo_unitario');
                });
            }
        });
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
