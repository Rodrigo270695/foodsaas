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
            if (! Schema::hasTable('fin_caja_sesiones')) {
                Schema::create('fin_caja_sesiones', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('sede_id');
                    $table->string('estado', 20)->default('abierta'); // abierta|cerrada
                    $table->decimal('monto_apertura', 14, 2)->default(0);
                    $table->decimal('monto_cierre_sistema', 14, 2)->nullable();
                    $table->decimal('monto_cierre_contado', 14, 2)->nullable();
                    $table->text('notas_cierre')->nullable();
                    $table->unsignedBigInteger('opened_by')->nullable();
                    $table->unsignedBigInteger('closed_by')->nullable();
                    $table->timestampTz('opened_at');
                    $table->timestampTz('closed_at')->nullable();
                    $table->timestampsTz();

                    $table->index(['sede_id', 'estado'], 'fin_caja_sesiones_sede_estado_index');
                });

                if (Schema::getConnection()->getDriverName() === 'pgsql') {
                    DB::statement(
                        'ALTER TABLE fin_caja_sesiones ADD CONSTRAINT fin_caja_sesiones_sede_fk '
                        .'FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE',
                    );
                    DB::statement(
                        'ALTER TABLE fin_caja_sesiones ADD CONSTRAINT fin_caja_sesiones_opened_by_fk '
                        .'FOREIGN KEY (opened_by) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                    DB::statement(
                        'ALTER TABLE fin_caja_sesiones ADD CONSTRAINT fin_caja_sesiones_closed_by_fk '
                        .'FOREIGN KEY (closed_by) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                }
            }

            if (! Schema::hasTable('ope_pedidos')) {
                Schema::create('ope_pedidos', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('sede_id');
                    $table->foreignUuid('mesa_id')
                        ->nullable()
                        ->constrained('cfg_mesas')
                        ->nullOnDelete();
                    $table->unsignedInteger('numero');
                    $table->string('estado', 30)->default('borrador');
                    $table->unsignedTinyInteger('comensales')->default(1);
                    $table->string('canal', 20)->default('salon'); // salon|mostrador|delivery
                    $table->text('notas')->nullable();
                    $table->decimal('subtotal', 14, 2)->default(0);
                    $table->decimal('descuento', 14, 2)->default(0);
                    $table->decimal('total', 14, 2)->default(0);
                    $table->unsignedBigInteger('opened_by')->nullable();
                    $table->timestampTz('enviado_at')->nullable();
                    $table->timestampTz('cerrado_at')->nullable();
                    $table->timestampsTz();

                    $table->unique(['sede_id', 'numero'], 'ope_pedidos_sede_numero_unique');
                    $table->index(['sede_id', 'estado'], 'ope_pedidos_sede_estado_index');
                    $table->index(['mesa_id', 'estado'], 'ope_pedidos_mesa_estado_index');
                });

                if (Schema::getConnection()->getDriverName() === 'pgsql') {
                    DB::statement(
                        'ALTER TABLE ope_pedidos ADD CONSTRAINT ope_pedidos_sede_fk '
                        .'FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE',
                    );
                    DB::statement(
                        'ALTER TABLE ope_pedidos ADD CONSTRAINT ope_pedidos_opened_by_fk '
                        .'FOREIGN KEY (opened_by) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                }
            }

            if (! Schema::hasTable('ope_pedido_lineas')) {
                Schema::create('ope_pedido_lineas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('pedido_id')
                        ->constrained('ope_pedidos')
                        ->cascadeOnDelete();
                    $table->foreignUuid('producto_id')
                        ->nullable()
                        ->constrained('cat_productos')
                        ->nullOnDelete();
                    $table->foreignUuid('area_id')
                        ->nullable()
                        ->constrained('cat_areas')
                        ->nullOnDelete();
                    $table->string('nombre', 180);
                    $table->decimal('precio_unitario', 14, 2);
                    $table->decimal('cantidad', 14, 3)->default(1);
                    $table->decimal('importe', 14, 2);
                    $table->string('estado', 30)->default('pendiente');
                    $table->text('notas')->nullable();
                    $table->unsignedInteger('orden')->default(0);
                    $table->timestampTz('enviado_at')->nullable();
                    $table->timestampTz('listo_at')->nullable();
                    $table->timestampsTz();

                    $table->index(['pedido_id', 'estado'], 'ope_pedido_lineas_pedido_estado_index');
                    $table->index(['area_id', 'estado'], 'ope_pedido_lineas_area_estado_index');
                });
            }

            if (! Schema::hasTable('fin_ventas')) {
                Schema::create('fin_ventas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('sede_id');
                    $table->foreignUuid('pedido_id')
                        ->nullable()
                        ->constrained('ope_pedidos')
                        ->nullOnDelete();
                    $table->foreignUuid('caja_sesion_id')
                        ->nullable()
                        ->constrained('fin_caja_sesiones')
                        ->nullOnDelete();
                    $table->string('estado', 20)->default('pagada'); // pagada|anulada
                    $table->decimal('subtotal', 14, 2)->default(0);
                    $table->decimal('descuento', 14, 2)->default(0);
                    $table->decimal('total', 14, 2)->default(0);
                    $table->unsignedBigInteger('created_by')->nullable();
                    $table->timestampsTz();

                    $table->index(['sede_id', 'created_at'], 'fin_ventas_sede_fecha_index');
                });

                if (Schema::getConnection()->getDriverName() === 'pgsql') {
                    DB::statement(
                        'ALTER TABLE fin_ventas ADD CONSTRAINT fin_ventas_sede_fk '
                        .'FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE CASCADE',
                    );
                    DB::statement(
                        'ALTER TABLE fin_ventas ADD CONSTRAINT fin_ventas_created_by_fk '
                        .'FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL',
                    );
                }
            }

            if (! Schema::hasTable('fin_pagos')) {
                Schema::create('fin_pagos', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('venta_id')
                        ->constrained('fin_ventas')
                        ->cascadeOnDelete();
                    $table->string('medio', 30); // efectivo|tarjeta|yape|plin|transferencia|otro
                    $table->decimal('monto', 14, 2);
                    $table->string('referencia', 120)->nullable();
                    $table->timestampsTz();

                    $table->index(['venta_id'], 'fin_pagos_venta_index');
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('fin_pagos');
            Schema::dropIfExists('fin_ventas');
            Schema::dropIfExists('ope_pedido_lineas');
            Schema::dropIfExists('ope_pedidos');
            Schema::dropIfExists('fin_caja_sesiones');
        });
    }
};
