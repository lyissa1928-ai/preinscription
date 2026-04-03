<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Supprimer la conversation" côté utilisateur (comme WhatsApp : supprimer pour moi).
     */
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->timestamp('user1_hidden_at')->nullable()->after('updated_at');
            $table->timestamp('user2_hidden_at')->nullable()->after('user1_hidden_at');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['user1_hidden_at', 'user2_hidden_at']);
        });
    }
};
