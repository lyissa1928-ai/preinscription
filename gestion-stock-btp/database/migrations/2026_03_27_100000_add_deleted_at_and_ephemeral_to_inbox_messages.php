<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inbox_messages', function (Blueprint $table) {
            $table->timestamp('deleted_at')->nullable()->after('read_at');
            $table->boolean('is_ephemeral')->default(false)->after('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::table('inbox_messages', function (Blueprint $table) {
            $table->dropColumn(['deleted_at', 'is_ephemeral']);
        });
    }
};
