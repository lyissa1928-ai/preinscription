<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Quantités enregistrées par le staff après livraison : reçu, disponible (stocké), utilisé.
     */
    public function up(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->unsignedInteger('quantity_available')->default(0)->after('quantity_received')
                ->comment('Quantité stockée / disponible après réception');
            $table->unsignedInteger('quantity_used')->default(0)->after('quantity_available')
                ->comment('Quantité déjà utilisée (reçu = disponible + utilisé)');
        });
    }

    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropColumn(['quantity_available', 'quantity_used']);
        });
    }
};
