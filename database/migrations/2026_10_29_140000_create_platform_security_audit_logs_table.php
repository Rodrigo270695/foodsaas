<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_security_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name', 255)->nullable();
            $table->string('actor_email', 255)->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('tenant_slug', 120)->nullable();
            $table->string('tenant_label', 255)->nullable();
            $table->string('action', 80);
            $table->string('modulo', 40);
            $table->string('subject_type', 80)->nullable();
            $table->string('subject_id', 64)->nullable();
            $table->string('subject_label', 255)->nullable();
            $table->string('summary', 500);
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();
            $table->index(['created_at']);
            $table->index(['modulo', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_security_audit_logs');
    }
};
