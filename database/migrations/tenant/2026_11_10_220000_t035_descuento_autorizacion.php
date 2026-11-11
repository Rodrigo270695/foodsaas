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
            if (Schema::hasTable('ope_pedidos')) {
                Schema::table('ope_pedidos', function (Blueprint $table): void {
                    if (! Schema::hasColumn('ope_pedidos', 'motivo_descuento')) {
                        $table->string('motivo_descuento', 200)->nullable()->after('descuento');
                    }
                    if (! Schema::hasColumn('ope_pedidos', 'descuento_autorizado_por')) {
                        $table->unsignedBigInteger('descuento_autorizado_por')->nullable()->after('motivo_descuento');
                    }
                });

                if (Schema::hasColumn('ope_pedidos', 'descuento_autorizado_por')) {
                    try {
                        DB::statement(
                            'ALTER TABLE ope_pedidos ADD CONSTRAINT ope_pedidos_descuento_autorizado_por_fk '
                            .'FOREIGN KEY (descuento_autorizado_por) REFERENCES public.users (id) ON DELETE SET NULL',
                        );
                    } catch (\Throwable) {
                    }
                }
            }

            if (Schema::hasTable('fin_ventas')) {
                Schema::table('fin_ventas', function (Blueprint $table): void {
                    if (! Schema::hasColumn('fin_ventas', 'motivo_descuento')) {
                        $table->string('motivo_descuento', 200)->nullable()->after('descuento');
                    }
                    if (! Schema::hasColumn('fin_ventas', 'descuento_autorizado_por')) {
                        $table->unsignedBigInteger('descuento_autorizado_por')->nullable()->after('motivo_descuento');
                    }
                });

                if (Schema::hasColumn('fin_ventas', 'descuento_autorizado_por')) {
                    try {
                        DB::statement(
                            'ALTER TABLE fin_ventas ADD CONSTRAINT fin_ventas_descuento_autorizado_por_fk '
                            .'FOREIGN KEY (descuento_autorizado_por) REFERENCES public.users (id) ON DELETE SET NULL',
                        );
                    } catch (\Throwable) {
                    }
                }
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('ope_pedidos')) {
                try {
                    DB::statement('ALTER TABLE ope_pedidos DROP CONSTRAINT IF EXISTS ope_pedidos_descuento_autorizado_por_fk');
                } catch (\Throwable) {
                }

                Schema::table('ope_pedidos', function (Blueprint $table): void {
                    if (Schema::hasColumn('ope_pedidos', 'descuento_autorizado_por')) {
                        $table->dropColumn('descuento_autorizado_por');
                    }
                    if (Schema::hasColumn('ope_pedidos', 'motivo_descuento')) {
                        $table->dropColumn('motivo_descuento');
                    }
                });
            }

            if (Schema::hasTable('fin_ventas')) {
                try {
                    DB::statement('ALTER TABLE fin_ventas DROP CONSTRAINT IF EXISTS fin_ventas_descuento_autorizado_por_fk');
                } catch (\Throwable) {
                }

                Schema::table('fin_ventas', function (Blueprint $table): void {
                    if (Schema::hasColumn('fin_ventas', 'descuento_autorizado_por')) {
                        $table->dropColumn('descuento_autorizado_por');
                    }
                    if (Schema::hasColumn('fin_ventas', 'motivo_descuento')) {
                        $table->dropColumn('motivo_descuento');
                    }
                });
            }
        });
    }
};
