<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Destinataire réel obligatoire pour toute sortie (type=distributed).
     * Peut être : étudiant, classe, enseignant, salle, laboratoire, usage interne, etc.
     */
    public function up(): void
    {
        Schema::table('user_stock_movements', function (Blueprint $table) {
            $table->string('recipient', 500)->nullable()->after('distributed_to_user_id')
                ->comment('Destinataire réel de la sortie (obligatoire pour type=distributed) : personne, classe, salle, usage interne, etc.');
        });
    }

    public function down(): void
    {
        Schema::table('user_stock_movements', function (Blueprint $table) {
            $table->dropColumn('recipient');
        });
    }
};
