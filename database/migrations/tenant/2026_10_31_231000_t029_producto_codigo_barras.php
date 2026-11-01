<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cat_productos')) {
                return;
            }

            if (! Schema::hasColumn('cat_productos', 'codigo_barras')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    $table->string('codigo_barras', 64)
                        ->nullable()
                        ->after('codigo');
                });
            }

            if (
                Schema::hasColumn('cat_productos', 'codigo_barras')
                && ! Schema::hasIndex('cat_productos', 'cat_productos_sede_codigo_barras_index')
            ) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    $table->index(
                        ['sede_id', 'codigo_barras'],
                        'cat_productos_sede_codigo_barras_index',
                    );
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cat_productos')) {
                return;
            }

            if (Schema::hasIndex('cat_productos', 'cat_productos_sede_codigo_barras_index')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    $table->dropIndex('cat_productos_sede_codigo_barras_index');
                });
            }

            if (Schema::hasColumn('cat_productos', 'codigo_barras')) {
                Schema::table('cat_productos', function (Blueprint $table): void {
                    $table->dropColumn('codigo_barras');
                });
            }
        });
    }
};
