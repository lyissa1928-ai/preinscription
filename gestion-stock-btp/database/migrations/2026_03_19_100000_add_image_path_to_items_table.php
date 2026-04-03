<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Image du matériel pour le catalogue.
     */
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('image_path', 500)->nullable()->after('description')->comment('Chemin ou URL de l\'image du matériel');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }
};
