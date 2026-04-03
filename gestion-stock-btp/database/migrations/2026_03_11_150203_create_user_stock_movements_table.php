<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mouvements de stock personnel : reçus (livraison) et distributions.
     * Permet le suivi par utilisateur : reçu, distribué, restant.
     */
    public function up(): void
    {
        Schema::create('user_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->comment('Utilisateur concerné');
            $table->foreignId('item_id')->nullable()->constrained()->onDelete('set null')->comment('Article (optionnel si désignation libre)');
            $table->string('designation', 500)->nullable()->comment('Désignation si pas d\'item catalogue');
            $table->integer('quantity')->comment('Quantité (toujours positive)');
            $table->string('type', 20)->comment('received = reçu / livré, distributed = distribué à autrui');
            $table->string('reference_type', 100)->nullable()->comment('MaterialRequest, RequestItem, etc.');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('distributed_to_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Si type=distributed : destinataire');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'item_id']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_stock_movements');
    }
};
