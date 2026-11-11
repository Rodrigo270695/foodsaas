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

            // PostgreSQL: no usar try/catch alrededor de DDL fallido sin ROLLBACK
            // (deja la transacción en 25P02 y el siguiente Schema::* explota).
            if (Schema::hasTable('fel_documents')) {
                DB::statement('ALTER TABLE fel_documents ADD COLUMN IF NOT EXISTS documento_afectado_id uuid NULL');
                DB::statement('ALTER TABLE fel_documents ADD COLUMN IF NOT EXISTS nota_motivo_codigo varchar(10) NULL');
                DB::statement('ALTER TABLE fel_documents ADD COLUMN IF NOT EXISTS nota_motivo_descripcion varchar(250) NULL');
                DB::statement('ALTER TABLE fel_documents ADD COLUMN IF NOT EXISTS guia_datos json NULL');

                if (! $this->hasConstraint('fel_documents', 'fel_documents_documento_afectado_id_foreign')) {
                    DB::statement(
                        'ALTER TABLE fel_documents
                         ADD CONSTRAINT fel_documents_documento_afectado_id_foreign
                         FOREIGN KEY (documento_afectado_id) REFERENCES fel_documents (id) ON DELETE SET NULL',
                    );
                }

                // Quitar UNIQUE de venta_id (NC/ND pueden compartir venta).
                $uniqueNames = DB::select(
                    "SELECT c.conname
                     FROM pg_constraint c
                     JOIN pg_class t ON t.oid = c.conrelid
                     JOIN pg_namespace n ON n.oid = t.relnamespace
                     WHERE n.nspname = current_schema()
                       AND t.relname = 'fel_documents'
                       AND c.contype = 'u'
                       AND pg_get_constraintdef(c.oid) ILIKE '%(venta_id)%'",
                );
                foreach ($uniqueNames as $row) {
                    $name = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $row->conname);
                    if ($name !== '') {
                        DB::statement("ALTER TABLE fel_documents DROP CONSTRAINT IF EXISTS {$name}");
                    }
                }

                // También índices unique huérfanos (Laravel a veces crea índice aparte).
                $uniqueIndexes = DB::select(
                    "SELECT i.relname AS index_name
                     FROM pg_index x
                     JOIN pg_class t ON t.oid = x.indrelid
                     JOIN pg_class i ON i.oid = x.indexrelid
                     JOIN pg_namespace n ON n.oid = t.relnamespace
                     JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (x.indkey)
                     WHERE n.nspname = current_schema()
                       AND t.relname = 'fel_documents'
                       AND x.indisunique = true
                       AND x.indisprimary = false
                       AND a.attname = 'venta_id'
                       AND NOT EXISTS (
                           SELECT 1 FROM pg_constraint c
                           WHERE c.conindid = x.indexrelid
                       )",
                );
                foreach ($uniqueIndexes as $row) {
                    $name = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $row->index_name);
                    if ($name !== '') {
                        DB::statement("DROP INDEX IF EXISTS {$name}");
                    }
                }

                DB::statement('ALTER TABLE fel_documents ALTER COLUMN venta_id DROP NOT NULL');
            }

            if (Schema::hasTable('ope_pedidos')) {
                DB::statement('ALTER TABLE ope_pedidos ADD COLUMN IF NOT EXISTS origen_externo varchar(40) NULL');
                DB::statement('ALTER TABLE ope_pedidos ADD COLUMN IF NOT EXISTS external_order_id varchar(120) NULL');
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
