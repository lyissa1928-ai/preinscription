<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('approved_by_user_id');
            $table->timestamp('rejected_at')->nullable()->after('rejection_reason');
            $table->foreignId('rejected_by_user_id')->nullable()->after('rejected_at')
                ->constrained('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->dropForeign(['rejected_by_user_id']);
            $table->dropColumn(['rejection_reason', 'rejected_at', 'rejected_by_user_id']);
        });
    }
};
