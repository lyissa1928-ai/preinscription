<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marque les lignes "désignation libre" comme matériel non répertorié,
     * proposé par les demandeurs pour intégration au référentiel par le point focal.
     */
    public function up(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->boolean('is_unlisted_material')->default(false)->after('designation')
                ->comment('Matériel non répertorié : proposé par le demandeur pour intégration au catalogue');
        });
    }

    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropColumn('is_unlisted_material');
        });
    }
};
