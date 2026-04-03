<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Activity Logs: Immutable audit trail for compliance and security
     * Tracks: CRUD operations, status changes, approvals, receive operations
     * Critical for financial audit and regulatory compliance
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('loggable_type');
            $table->unsignedBigInteger('loggable_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('action', [
                'created',
                'updated',
                'deleted',
                'approved',
                'rejected',
                'submitted',
                'aggregated',
                'received',
                'cancelled',
                'custom'
            ]);
            $table->json('changes')->nullable()->comment('Detailed before/after changes (for updates)');
            $table->string('description')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->index();

            // Composite index for efficient querying
            $table->index(['loggable_type', 'loggable_id']);
            $table->index(['user_id', 'created_at']);
            $table->index('action');

            // Immutability: no updates/deletes after creation
            $table->comment('Immutable audit trail - updates and deletes are not permitted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
