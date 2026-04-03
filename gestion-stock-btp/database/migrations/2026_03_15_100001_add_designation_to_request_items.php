<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ligne demande matériel : désignation (libre ou copie du catalogue pour affichage).
     */
    public function up(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->string('designation', 500)->nullable()->after('material_request_id')->comment('Désignation du matériel (libre ou reprise de l\'item)');
        });
    }

    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropColumn('designation');
        });
    }
};
