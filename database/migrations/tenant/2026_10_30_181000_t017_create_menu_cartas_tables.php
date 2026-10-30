<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('men_cartas')) {
                Schema::create('men_cartas', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->string('nombre', 150);
                    $table->string('slug', 160)->unique();
                    $table->string('descripcion', 500)->nullable();
                    $table->string('fondo_preset', 40)->default('cream');
                    $table->unsignedTinyInteger('paginas')->default(1);
                    $table->boolean('publicada')->default(false);
                    $table->date('vigente_desde')->nullable();
                    $table->date('vigente_hasta')->nullable();
                    $table->timestampsTz();

                    $table->index(['publicada', 'vigente_desde', 'vigente_hasta'], 'men_cartas_vigencia_index');
                });
            }

            if (! Schema::hasTable('men_carta_items')) {
                Schema::create('men_carta_items', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('carta_id')
                        ->constrained('men_cartas')
                        ->cascadeOnDelete();
                    $table->foreignUuid('producto_id')
                        ->constrained('cat_productos')
                        ->cascadeOnDelete();
                    $table->unsignedTinyInteger('pagina')->default(1);
                    $table->unsignedInteger('orden')->default(0);
                    $table->string('notas', 255)->nullable();
                    $table->timestampsTz();

                    $table->unique(['carta_id', 'producto_id', 'pagina'], 'men_carta_items_unique_producto_pagina');
                    $table->index(['carta_id', 'pagina', 'orden'], 'men_carta_items_orden_index');
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('men_carta_items');
            Schema::dropIfExists('men_cartas');
        });
    }
};
