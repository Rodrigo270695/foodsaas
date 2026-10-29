<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->text('cancel_reason')->nullable()->after('cancelled_at');
            $table->text('cancel_feedback')->nullable()->after('cancel_reason');
            $table->decimal('descuento_pct', 5, 2)->default(0)->after('precio_pactado');
            $table->timestampTz('proximo_cobro_at')->nullable()->after('descuento_pct');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'cancel_reason',
                'cancel_feedback',
                'descuento_pct',
                'proximo_cobro_at',
            ]);
        });
    }
};
