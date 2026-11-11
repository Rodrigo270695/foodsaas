<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('mkt_ofertas')) {
                Schema::create('mkt_ofertas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('sede_id')->nullable()->index();
                    $table->string('codigo', 40);
                    $table->string('nombre', 150);
                    $table->string('tipo', 20); // monto|porcentaje
                    $table->decimal('valor', 12, 2);
                    $table->decimal('tope_monto', 12, 2)->nullable();
                    $table->unsignedInteger('usos_max')->nullable();
                    $table->unsignedInteger('usos_count')->default(0);
                    $table->date('vigente_desde')->nullable();
                    $table->date('vigente_hasta')->nullable();
                    $table->boolean('activa')->default(true);
                    $table->timestampsTz();

                    $table->unique(['codigo'], 'mkt_ofertas_codigo_unique');
                });
            }

            if (Schema::hasTable('crm_clientes') && ! Schema::hasColumn('crm_clientes', 'saldo_credito')) {
                Schema::table('crm_clientes', function (Blueprint $table): void {
                    $table->decimal('saldo_credito', 12, 2)->default(0)->after('notas');
                });
            }

            if (! Schema::hasTable('crm_credito_movimientos')) {
                Schema::create('crm_credito_movimientos', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->uuid('cliente_id')->index();
                    $table->string('tipo', 20); // cargo|abono|ajuste
                    $table->decimal('monto', 12, 2);
                    $table->decimal('saldo_resultante', 12, 2);
                    $table->string('motivo', 255)->nullable();
                    $table->string('referencia_tipo', 40)->nullable();
                    $table->uuid('referencia_id')->nullable();
                    $table->foreignUuid('user_id')->nullable();
                    $table->timestampsTz();
                });
            }

            if (Schema::hasTable('ope_pedidos') && ! Schema::hasColumn('ope_pedidos', 'oferta_id')) {
                Schema::table('ope_pedidos', function (Blueprint $table): void {
                    $table->uuid('oferta_id')->nullable()->after('descuento_autorizado_por');
                    $table->string('oferta_codigo', 40)->nullable()->after('oferta_id');
                });
            }

            if (Schema::hasTable('fin_ventas') && ! Schema::hasColumn('fin_ventas', 'oferta_id')) {
                Schema::table('fin_ventas', function (Blueprint $table): void {
                    $table->uuid('oferta_id')->nullable();
                    $table->string('oferta_codigo', 40)->nullable();
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('fin_ventas')) {
                Schema::table('fin_ventas', function (Blueprint $table): void {
                    if (Schema::hasColumn('fin_ventas', 'oferta_id')) {
                        $table->dropColumn(['oferta_id', 'oferta_codigo']);
                    }
                });
            }

            if (Schema::hasTable('ope_pedidos')) {
                Schema::table('ope_pedidos', function (Blueprint $table): void {
                    if (Schema::hasColumn('ope_pedidos', 'oferta_id')) {
                        $table->dropColumn(['oferta_id', 'oferta_codigo']);
                    }
                });
            }

            Schema::dropIfExists('crm_credito_movimientos');

            if (Schema::hasTable('crm_clientes') && Schema::hasColumn('crm_clientes', 'saldo_credito')) {
                Schema::table('crm_clientes', function (Blueprint $table): void {
                    $table->dropColumn('saldo_credito');
                });
            }

            Schema::dropIfExists('mkt_ofertas');
        });
    }
};
