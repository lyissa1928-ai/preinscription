<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Expenses Tracking: Records expenses against allocated budgets
     * Critical for budget compliance and spend tracking
     */
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_allocation_id')->constrained()->onDelete('restrict');
            $table->foreignId('aggregated_order_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('amount', 15, 2);
            $table->enum('category', ['material', 'service', 'maintenance', 'other'])->default('material');
            $table->text('description');
            $table->date('expense_date');
            $table->string('reference_number', 50)->nullable();
            $table->enum('status', ['pending', 'approved', 'reconciled'])->default('pending');
            $table->foreignId('recorded_by_user_id')->constrained('users')->onDelete('restrict');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['budget_allocation_id', 'status']);
            $table->index(['aggregated_order_id', 'status']);
            $table->index('expense_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
