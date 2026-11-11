<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cfg_delivery_zonas')) {
                Schema::create('cfg_delivery_zonas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('sede_id')->index();
                    $table->string('nombre', 120);
                    $table->decimal('tarifa', 12, 2)->default(0);
                    $table->boolean('activa')->default(true);
                    $table->unsignedSmallInteger('orden')->default(0);
                    $table->timestampsTz();
                });
            }

            if (! Schema::hasTable('ope_pedidos')) {
                return;
            }

            Schema::table('ope_pedidos', function (Blueprint $table): void {
                if (! Schema::hasColumn('ope_pedidos', 'cliente_id')) {
                    $table->uuid('cliente_id')->nullable()->after('mesa_id');
                    $table->index('cliente_id');
                }
                if (! Schema::hasColumn('ope_pedidos', 'delivery_nombre')) {
                    $table->string('delivery_nombre', 180)->nullable()->after('notas');
                }
                if (! Schema::hasColumn('ope_pedidos', 'delivery_telefono')) {
                    $table->string('delivery_telefono', 40)->nullable()->after('delivery_nombre');
                }
                if (! Schema::hasColumn('ope_pedidos', 'delivery_direccion')) {
                    $table->string('delivery_direccion', 255)->nullable()->after('delivery_telefono');
                }
                if (! Schema::hasColumn('ope_pedidos', 'delivery_zona_id')) {
                    $table->uuid('delivery_zona_id')->nullable()->after('delivery_direccion');
                    $table->index('delivery_zona_id');
                }
                if (! Schema::hasColumn('ope_pedidos', 'delivery_tarifa')) {
                    $table->decimal('delivery_tarifa', 12, 2)->default(0)->after('delivery_zona_id');
                }
                if (! Schema::hasColumn('ope_pedidos', 'delivery_estado')) {
                    $table->string('delivery_estado', 20)->nullable()->after('delivery_tarifa');
                    $table->index('delivery_estado');
                }
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('ope_pedidos')) {
                Schema::table('ope_pedidos', function (Blueprint $table): void {
                    foreach ([
                        'cliente_id',
                        'delivery_nombre',
                        'delivery_telefono',
                        'delivery_direccion',
                        'delivery_zona_id',
                        'delivery_tarifa',
                        'delivery_estado',
                    ] as $col) {
                        if (Schema::hasColumn('ope_pedidos', $col)) {
                            $table->dropColumn($col);
                        }
                    }
                });
            }

            Schema::dropIfExists('cfg_delivery_zonas');
        });
    }
};
