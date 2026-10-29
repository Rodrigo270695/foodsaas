<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('schema_name', 63)->nullable()->unique()->after('slug');
            $table->string('ruc', 11)->nullable()->unique()->after('nombre_comercial');
            $table->string('email_admin', 150)->nullable()->unique()->after('ruc');
            $table->string('telefono', 20)->nullable()->after('email_admin');
            $table->string('direccion', 255)->nullable()->after('telefono');
            $table->string('estado', 20)->default('trial')->after('direccion');
            $table->timestampTz('trial_ends_at')->nullable()->after('estado');
            $table->timestampTz('suspended_at')->nullable()->after('trial_ends_at');
            $table->text('suspension_reason')->nullable()->after('suspended_at');
            $table->timestampTz('cancelled_at')->nullable()->after('suspension_reason');
            $table->text('cancel_reason')->nullable()->after('cancelled_at');
            $table->boolean('onboarding_completado')->default(false)->after('cancel_reason');
            $table->unsignedSmallInteger('onboarding_paso')->default(0)->after('onboarding_completado');
            $table->string('timezone', 50)->default('America/Lima')->after('onboarding_paso');
            $table->string('locale', 10)->default('es_PE')->after('timezone');
            $table->string('canal_adquisicion', 50)->nullable()->after('locale');
            $table->json('modulos_deshabilitados')->nullable()->after('canal_adquisicion');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'schema_name',
                'ruc',
                'email_admin',
                'telefono',
                'direccion',
                'estado',
                'trial_ends_at',
                'suspended_at',
                'suspension_reason',
                'cancelled_at',
                'cancel_reason',
                'onboarding_completado',
                'onboarding_paso',
                'timezone',
                'locale',
                'canal_adquisicion',
                'modulos_deshabilitados',
            ]);
        });
    }
};
