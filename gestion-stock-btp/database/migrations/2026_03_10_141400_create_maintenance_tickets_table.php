<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Maintenance Tickets: Track asset maintenance and repairs
     * Complements asset lifecycle management
     */
    public function up(): void
    {
        Schema::create('maintenance_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->onDelete('cascade');
            $table->string('ticket_number', 50)->unique();
            $table->enum('type', ['preventive', 'corrective'])->default('corrective');
            $table->enum('status', [
                'open',
                'in_progress',
                'pending_parts',
                'resolved',
                'closed'
            ])->default('open')->index();
            $table->text('description');
            $table->date('reported_date');
            $table->date('scheduled_date')->nullable();
            $table->date('completed_date')->nullable();
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->decimal('actual_cost', 12, 2)->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['asset_id', 'status']);
            $table->index(['assigned_to_user_id', 'status']);
            $table->index('reported_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_tickets');
    }
};
