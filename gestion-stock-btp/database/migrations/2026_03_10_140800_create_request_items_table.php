<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Request Items: Detail lines of a MaterialRequest
     * Tracks item state through Federation workflow: pending → aggregated → received
     * Critical for traceability: which item from which RequestLine satisfies which AggregatedOrder line
     */
    public function up(): void
    {
        Schema::create('request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_request_id')->constrained()->onDelete('cascade');
            $table->foreignId('item_id')->constrained()->onDelete('restrict');
            $table->integer('requested_quantity');
            $table->enum('status', [
                'pending',           // Awaiting aggregation
                'aggregated',        // Included in an AggregatedOrder
                'partially_received', // Some quantity received
                'received',          // Full quantity received
                'rejected'           // Not to be fulfilled
            ])->default('pending')->index();
            $table->integer('quantity_received')->default(0);
            $table->integer('quantity_rejected')->default(0);
            $table->decimal('unit_price', 12, 2)->nullable()->comment('Expected unit price');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['material_request_id', 'status']);
            $table->index(['item_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_items');
    }
};
