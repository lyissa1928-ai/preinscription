<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Type de demande (groupée / individuelle) et attribution des lignes par utilisateur.
     */
    public function up(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->string('request_type', 20)->default('individual')->after('status')
                ->comment('grouped = demande groupée, individual = demande personnelle');
        });

        Schema::table('request_items', function (Blueprint $table) {
            $table->foreignId('requested_by_user_id')->nullable()->after('material_request_id')
                ->constrained('users')->onDelete('set null')
                ->comment('Pour demande groupée : membre du staff qui a ajouté cette ligne');
        });
    }

    public function down(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->dropColumn('request_type');
        });
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropForeign(['requested_by_user_id']);
            $table->dropColumn('requested_by_user_id');
        });
    }
};
