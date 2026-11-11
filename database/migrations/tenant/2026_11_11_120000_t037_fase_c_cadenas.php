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
            if (! Schema::hasTable('log_transferencias')) {
                Schema::create('log_transferencias', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('sede_origen_id')->constrained('sedes')->cascadeOnDelete();
                    $table->foreignUuid('sede_destino_id')->constrained('sedes')->cascadeOnDelete();
                    $table->unsignedInteger('numero');
                    $table->string('estado', 20)->default('borrador');
                    $table->string('notas', 500)->nullable();
                    $table->unsignedBigInteger('user_id')->nullable();
                    $table->timestampTz('enviada_at')->nullable();
                    $table->timestampTz('recibida_at')->nullable();
                    $table->timestampsTz();

                    $table->unique(['sede_origen_id', 'numero'], 'log_transferencias_origen_numero_unique');
                    $table->index(['sede_destino_id', 'estado'], 'log_transferencias_destino_estado_index');
                });

                if (! $this->hasConstraint('log_transferencias', 'log_transferencias_user_id_foreign')) {
                    DB::statement(
                        'ALTER TABLE log_transferencias
                         ADD CONSTRAINT log_transferencias_user_id_foreign
                         FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                }
            }

            if (! Schema::hasTable('log_transferencia_lineas')) {
                Schema::create('log_transferencia_lineas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('transferencia_id')
                        ->constrained('log_transferencias')
                        ->cascadeOnDelete();
                    $table->string('linea_tipo', 20);
                    $table->foreignUuid('origen_insumo_id')->nullable()->constrained('inv_insumos')->restrictOnDelete();
                    $table->foreignUuid('destino_insumo_id')->nullable()->constrained('inv_insumos')->restrictOnDelete();
                    $table->foreignUuid('origen_producto_id')->nullable()->constrained('cat_productos')->restrictOnDelete();
                    $table->foreignUuid('destino_producto_id')->nullable()->constrained('cat_productos')->restrictOnDelete();
                    $table->decimal('cantidad', 14, 3);
                    $table->string('unidad', 20)->default('und');
                    $table->timestampsTz();

                    $table->index(['transferencia_id'], 'log_transferencia_lineas_tf_index');
                });
            }

            if (! Schema::hasTable('log_requerimientos')) {
                Schema::create('log_requerimientos', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('sede_solicitante_id')->constrained('sedes')->cascadeOnDelete();
                    $table->foreignUuid('sede_abastecedora_id')->constrained('sedes')->cascadeOnDelete();
                    $table->unsignedInteger('numero');
                    $table->string('estado', 20)->default('borrador');
                    $table->string('prioridad', 20)->default('normal');
                    $table->date('fecha_necesaria')->nullable();
                    $table->string('notas', 500)->nullable();
                    $table->foreignUuid('transferencia_id')->nullable()->constrained('log_transferencias')->nullOnDelete();
                    $table->unsignedBigInteger('user_id')->nullable();
                    $table->timestampsTz();

                    $table->unique(['sede_solicitante_id', 'numero'], 'log_requerimientos_sede_numero_unique');
                    $table->index(['sede_abastecedora_id', 'estado'], 'log_requerimientos_abast_estado_index');
                });

                if (! $this->hasConstraint('log_requerimientos', 'log_requerimientos_user_id_foreign')) {
                    DB::statement(
                        'ALTER TABLE log_requerimientos
                         ADD CONSTRAINT log_requerimientos_user_id_foreign
                         FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                }
            }

            if (! Schema::hasTable('log_requerimiento_lineas')) {
                Schema::create('log_requerimiento_lineas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('requerimiento_id')
                        ->constrained('log_requerimientos')
                        ->cascadeOnDelete();
                    $table->string('linea_tipo', 20);
                    $table->string('nombre', 180);
                    $table->foreignUuid('insumo_id')->nullable()->constrained('inv_insumos')->nullOnDelete();
                    $table->foreignUuid('producto_id')->nullable()->constrained('cat_productos')->nullOnDelete();
                    $table->decimal('cantidad', 14, 3);
                    $table->string('unidad', 20)->default('und');
                    $table->timestampsTz();

                    $table->index(['requerimiento_id'], 'log_requerimiento_lineas_req_index');
                });
            }

            if (! Schema::hasTable('cfg_delivery_integraciones')) {
                Schema::create('cfg_delivery_integraciones', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('sede_id')->constrained('sedes')->cascadeOnDelete();
                    $table->string('proveedor', 40);
                    $table->boolean('activo')->default(false);
                    $table->string('api_key', 255)->nullable();
                    $table->string('api_secret', 255)->nullable();
                    $table->string('store_id', 120)->nullable();
                    $table->string('webhook_secret', 255)->nullable();
                    $table->json('meta')->nullable();
                    $table->timestampsTz();

                    $table->unique(['sede_id', 'proveedor'], 'cfg_delivery_integraciones_sede_prov_unique');
                });
            }

            if (! Schema::hasTable('log_delivery_externo')) {
                Schema::create('log_delivery_externo', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('sede_id')->constrained('sedes')->cascadeOnDelete();
                    $table->string('proveedor', 40);
                    $table->string('external_id', 120);
                    $table->string('estado', 40)->default('recibido');
                    $table->foreignUuid('pedido_id')->nullable()->constrained('ope_pedidos')->nullOnDelete();
                    $table->json('payload')->nullable();
                    $table->text('error_mensaje')->nullable();
                    $table->timestampsTz();

                    $table->unique(['proveedor', 'external_id'], 'log_delivery_externo_prov_ext_unique');
                    $table->index(['sede_id', 'estado'], 'log_delivery_externo_sede_estado_index');
                });
            }

            if (Schema::hasTable('fel_documents')) {
                if (! Schema::hasColumn('fel_documents', 'documento_afectado_id')) {
                    Schema::table('fel_documents', function (Blueprint $table): void {
                        $table->uuid('documento_afectado_id')->nullable()->after('venta_id');
                        $table->string('nota_motivo_codigo', 10)->nullable()->after('documento_afectado_id');
                        $table->string('nota_motivo_descripcion', 250)->nullable()->after('nota_motivo_codigo');
                        $table->json('guia_datos')->nullable()->after('nota_motivo_descripcion');
                    });

                    try {
                        Schema::table('fel_documents', function (Blueprint $table): void {
                            $table->foreign('documento_afectado_id')
                                ->references('id')
                                ->on('fel_documents')
                                ->nullOnDelete();
                        });
                    } catch (Throwable) {
                    }
                }

                try {
                    DB::statement('ALTER TABLE fel_documents DROP CONSTRAINT IF EXISTS fel_documents_venta_id_unique');
                } catch (Throwable) {
                }

                try {
                    Schema::table('fel_documents', function (Blueprint $table): void {
                        $table->dropUnique(['venta_id']);
                    });
                } catch (Throwable) {
                }

                if (Schema::hasColumn('fel_documents', 'venta_id')) {
                    try {
                        DB::statement('ALTER TABLE fel_documents ALTER COLUMN venta_id DROP NOT NULL');
                    } catch (Throwable) {
                    }
                }
            }

            if (Schema::hasTable('ope_pedidos') && ! Schema::hasColumn('ope_pedidos', 'origen_externo')) {
                Schema::table('ope_pedidos', function (Blueprint $table): void {
                    $table->string('origen_externo', 40)->nullable()->after('canal');
                    $table->string('external_order_id', 120)->nullable()->after('origen_externo');
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('log_delivery_externo');
            Schema::dropIfExists('cfg_delivery_integraciones');
            Schema::dropIfExists('log_requerimiento_lineas');
            Schema::dropIfExists('log_requerimientos');
            Schema::dropIfExists('log_transferencia_lineas');
            Schema::dropIfExists('log_transferencias');
        });
    }

    private function hasConstraint(string $table, string $name): bool
    {
        $row = DB::selectOne(
            'SELECT 1 AS ok FROM pg_constraint WHERE conname = ?',
            [$name],
        );

        return $row !== null;
    }
};
