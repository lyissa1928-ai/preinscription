<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Date de sortie et catégorie pour traçabilité des sorties staff.
     */
    public function up(): void
    {
        Schema::table('user_stock_movements', function (Blueprint $table) {
            $table->date('distributed_at')->nullable()->after('notes')->comment('Date de sortie (obligatoire pour type=distributed)');
            $table->foreignId('category_id')->nullable()->after('item_id')->constrained()->onDelete('set null')->comment('Catégorie de l\'article sorti');
        });
    }

    public function down(): void
    {
        Schema::table('user_stock_movements', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn(['distributed_at', 'category_id']);
        });
    }
};
