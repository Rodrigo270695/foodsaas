<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('men_cartas', function (Blueprint $table): void {
            $table->string('fondo_imagen_path', 500)->nullable()->after('fondo_preset');
            $table->string('tipografia', 60)->default('serif')->after('fondo_imagen_path');
            $table->string('color_texto', 7)->nullable()->after('tipografia');
        });
    }

    public function down(): void
    {
        Schema::table('men_cartas', function (Blueprint $table): void {
            $table->dropColumn(['fondo_imagen_path', 'tipografia', 'color_texto']);
        });
    }
};
