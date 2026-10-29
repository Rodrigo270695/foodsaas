<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('plan_id')->constrained('plans');
            $table->string('estado', 20)->default('trial');
            $table->string('ciclo', 10)->default('mensual');
            $table->timestampTz('trial_ends_at')->nullable();
            $table->timestampTz('current_period_start')->nullable();
            $table->timestampTz('current_period_end')->nullable();
            $table->timestampTz('grace_ends_at')->nullable();
            $table->timestampTz('cancelled_at')->nullable();
            $table->decimal('precio_pactado', 10, 2)->default(0);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
