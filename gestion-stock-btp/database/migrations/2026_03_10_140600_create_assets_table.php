<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Assets: Fixed, serialized equipment with lifecycle management
     * Suitable for: Computers, vehicles, machinery, furniture with serial numbers
     * Lifecycle: En service (In service) → Maintenance → Réformé (Decommissioned)
     */
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->onDelete('restrict');
            $table->string('name', 150);
            $table->string('serial_number', 100)->unique()->comment('Unique identifier/barcode');
            $table->string('model', 100)->nullable();
            $table->string('manufacturer', 100)->nullable();
            $table->decimal('acquisition_cost', 12, 2);
            $table->date('acquisition_date');
            $table->enum('status', ['en_service', 'maintenance', 'reformé'])->default('en_service');
            $table->foreignId('current_campus_id')->nullable()->constrained('campuses')->onDelete('set null');
            $table->foreignId('current_warehouse_id')->nullable()->constrained('warehouses')->onDelete('set null');
            $table->string('location_detail')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category_id', 'status', 'current_campus_id']);
            $table->index('serial_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
