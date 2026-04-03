<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Consommables: Consumable items managed by quantity and reorder thresholds
     * Suitable for: Office supplies, fuel, cleaning materials, spare parts, etc.
     */
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->onDelete('restrict');
            $table->string('name', 150)->unique();
            $table->string('code', 30)->unique();
            $table->string('unit', 20)->comment('UNIT: pieces, kg, liters, boxes, etc.');
            $table->decimal('unit_cost', 12, 2);
            $table->integer('reorder_threshold')->comment('Minimum quantity before alert');
            $table->integer('reorder_quantity')->comment('Quantity to order when threshold reached');
            $table->integer('stock_quantity')->default(0)->comment('Current stock quantity');
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category_id', 'is_active']);
            $table->index('code');
            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
