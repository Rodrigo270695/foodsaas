<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (! Schema::hasTable('fel_documents')) {
                Schema::create('fel_documents', function (Blueprint $table): void {
                    $table->uuid('id')->primary();
                    $table->foreignUuid('venta_id')
                        ->unique()
                        ->constrained('fin_ventas')
                        ->cascadeOnDelete();
                    $table->foreignUuid('fel_serie_id')
                        ->constrained('fel_series')
                        ->restrictOnDelete();

                    $table->unsignedTinyInteger('tipo_comprobante');
                    $table->string('serie', 4);
                    $table->unsignedBigInteger('correlativo');
                    $table->string('numero_completo', 20);

                    $table->unsignedTinyInteger('receptor_tipo_doc');
                    $table->string('receptor_num_doc', 15);
                    $table->string('receptor_nombre', 200);

                    $table->decimal('subtotal', 14, 2);
                    $table->decimal('igv_monto', 14, 2);
                    $table->decimal('total', 14, 2);
                    $table->char('moneda', 3)->default('PEN');

                    $table->string('estado', 24)->default('pendiente');
                    $table->string('nubefact_id', 100)->nullable();
                    $table->string('url_pdf', 500)->nullable();
                    $table->string('url_xml', 500)->nullable();
                    $table->string('url_cdr', 500)->nullable();
                    $table->string('enlace_consulta', 500)->nullable();
                    $table->json('apisunat_payload')->nullable();
                    $table->string('apisunat_mode', 16)->nullable();
                    $table->text('error_mensaje')->nullable();
                    $table->timestampTz('emitido_at')->nullable();
                    $table->timestampTz('anulado_at')->nullable();
                    $table->timestampsTz();

                    $table->index('estado');
                });
            }

            if (Schema::hasTable('fin_ventas')) {
                Schema::table('fin_ventas', function (Blueprint $table): void {
                    if (! Schema::hasColumn('fin_ventas', 'fel_estado')) {
                        $table->string('fel_estado', 24)->default('sin_cpe')->after('tipo_comprobante');
                    }
                    if (! Schema::hasColumn('fin_ventas', 'fel_document_id')) {
                        $table->uuid('fel_document_id')->nullable()->after('fel_estado');
                    }
                });

                if (Schema::hasColumn('fin_ventas', 'fel_document_id')) {
                    try {
                        Schema::table('fin_ventas', function (Blueprint $table): void {
                            $table->foreign('fel_document_id')
                                ->references('id')
                                ->on('fel_documents')
                                ->nullOnDelete();
                        });
                    } catch (\Throwable) {
                        // FK puede existir si se re-ejecuta parcialmente.
                    }
                }
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasTable('fin_ventas') && Schema::hasColumn('fin_ventas', 'fel_document_id')) {
                Schema::table('fin_ventas', function (Blueprint $table): void {
                    try {
                        $table->dropForeign(['fel_document_id']);
                    } catch (\Throwable) {
                    }
                    if (Schema::hasColumn('fin_ventas', 'fel_document_id')) {
                        $table->dropColumn('fel_document_id');
                    }
                    if (Schema::hasColumn('fin_ventas', 'fel_estado')) {
                        $table->dropColumn('fel_estado');
                    }
                });
            }

            Schema::dropIfExists('fel_documents');
        });
    }
};
