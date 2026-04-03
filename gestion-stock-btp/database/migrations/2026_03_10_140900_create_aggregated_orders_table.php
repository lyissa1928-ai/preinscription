<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Aggregated Orders: Orders created by Point Focal aggregating RequestItems from multiple campuses
     * Maps many-to-many: multiple RequestItems → single PO from supplier
     * Maintains full traceability for Federation workflow
     */
    public function up(): void
    {
        Schema::create('aggregated_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->onDelete('restrict');
            $table->string('po_number', 50)->unique();
            $table->enum('status', [
                'draft',
                'confirmed',
                'partially_received',
                'received',
                'cancelled'
            ])->default('draft')->index();
            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('restrict');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['supplier_id', 'status']);
            $table->index('po_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aggregated_orders');
    }
};
