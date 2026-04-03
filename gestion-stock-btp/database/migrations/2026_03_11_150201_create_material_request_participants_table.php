<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Participants à une demande groupée (par campus).
     * Chaque staff peut participer à une demande et doit être identifié.
     */
    public function up(): void
    {
        Schema::create('material_request_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_request_id')->constrained('material_requests')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['material_request_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_request_participants');
    }
};
