<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bons de sortie : générés automatiquement après chaque livraison ou distribution.
     * Traçabilité : matériel, quantité, date, destinataire, auteur.
     */
    public function up(): void
    {
        Schema::create('delivery_slips', function (Blueprint $table) {
            $table->id();
            $table->string('slip_number', 30)->unique()->comment('Ex. BOS-2026-00001');
            $table->string('type', 20)->comment('delivery = livraison, distribution = sortie');
            $table->foreignId('user_stock_movement_id')->nullable()->constrained('user_stock_movements')->onDelete('set null');
            $table->foreignId('campus_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamp('performed_at')->comment('Date/heure de l\'opération');
            $table->foreignId('recipient_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Bénéficiaire (staff livré ou destinataire distribution)');
            $table->string('recipient_label', 500)->nullable()->comment('Libellé destinataire (ex. étudiant, classe)');
            $table->foreignId('author_user_id')->constrained('users')->onDelete('restrict')->comment('Auteur de l\'action');
            $table->foreignId('item_id')->nullable()->constrained()->onDelete('set null');
            $table->string('designation', 500)->nullable();
            $table->integer('quantity')->unsigned();
            $table->string('reference_type', 100)->nullable()->comment('MaterialRequest, etc.');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['type', 'campus_id']);
            $table->index(['recipient_user_id', 'performed_at']);
            $table->index(['author_user_id', 'performed_at']);
            $table->index('performed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_slips');
    }
};
