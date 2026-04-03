<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Material Requests: Header table for material requisition from each campus
     * Each campus submits one request, which contains multiple RequestItems
     */
    public function up(): void
    {
        Schema::create('material_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campus_id')->constrained()->onDelete('cascade');
            $table->foreignId('requester_user_id')->constrained('users')->onDelete('restrict');
            $table->string('request_number', 50)->unique();
            $table->enum('status', [
                'draft',
                'submitted',
                'approved',
                'aggregated',
                'partially_received',
                'received',
                'cancelled'
            ])->default('draft')->index();
            $table->date('request_date');
            $table->date('needed_by_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'status']);
            $table->index(['requester_user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_requests');
    }
};
