<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rendre item_id nullable pour permettre les lignes à désignation libre.
     * Nécessite doctrine/dbal pour SQLite : composer require doctrine/dbal
     */
    public function up(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->foreignId('item_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->foreignId('item_id')->nullable(false)->change();
        });
    }
};
