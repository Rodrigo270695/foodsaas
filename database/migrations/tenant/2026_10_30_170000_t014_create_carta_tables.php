<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('cat_categorias')) {
                Schema::create('cat_categorias', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->string('nombre', 120);
                    $table->string('descripcion', 255)->nullable();
                    $table->unsignedInteger('orden')->default(0);
                    $table->boolean('activa')->default(true);
                    $table->timestampsTz();

                    $table->index(['activa', 'orden'], 'cat_categorias_activa_orden_index');
                });
            }

            if (! Schema::hasTable('cat_productos')) {
                Schema::create('cat_productos', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('categoria_id')
                        ->constrained('cat_categorias')
                        ->cascadeOnDelete();
                    $table->string('nombre', 150);
                    $table->string('descripcion', 500)->nullable();
                    $table->string('codigo', 40)->nullable();
                    $table->decimal('precio', 12, 2)->default(0);
                    $table->unsignedInteger('orden')->default(0);
                    $table->boolean('activo')->default(true);
                    $table->timestampsTz();

                    $table->index(['categoria_id', 'activo', 'orden'], 'cat_productos_cat_activo_orden_index');
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('cat_productos');
            Schema::dropIfExists('cat_categorias');
        });
    }
};
