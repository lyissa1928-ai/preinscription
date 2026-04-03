<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dépenses directes sur le budget campus (validation de demandes par le point focal).
     * budget_id + material_request_id permettent de lier une dépense à un budget campus et à la demande validée.
     */
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignId('budget_id')->nullable()->after('id')->constrained('budgets')->onDelete('restrict');
            $table->foreignId('material_request_id')->nullable()->after('aggregated_order_id')->constrained('material_requests')->onDelete('set null');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['budget_allocation_id']);
        });
        Schema::table('expenses', function (Blueprint $table) {
            $table->unsignedBigInteger('budget_allocation_id')->nullable()->change();
        });
        Schema::table('expenses', function (Blueprint $table) {
            $table->foreign('budget_allocation_id')->references('id')->on('budget_allocations')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['budget_id']);
            $table->dropForeign(['material_request_id']);
        });
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['budget_allocation_id']);
        });
        Schema::table('expenses', function (Blueprint $table) {
            $table->unsignedBigInteger('budget_allocation_id')->nullable(false)->change();
        });
        Schema::table('expenses', function (Blueprint $table) {
            $table->foreign('budget_allocation_id')->references('id')->on('budget_allocations')->onDelete('restrict');
        });
    }
};
