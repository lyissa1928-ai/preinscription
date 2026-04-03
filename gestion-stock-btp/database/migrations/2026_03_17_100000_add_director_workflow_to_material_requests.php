<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Workflow : Point focal transmet au directeur → Directeur approuve/rejette → Point focal valide.
     * Nouveaux statuts : pending_director (transmise au directeur), director_approved (approuvée par le directeur, en attente validation PF).
     */
    public function up(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->timestamp('transmitted_at')->nullable()->after('submitted_at')->comment('Date de transmission au directeur par le point focal');
            $table->foreignId('transmitted_by_user_id')->nullable()->after('transmitted_at')->constrained('users')->onDelete('set null');
            $table->timestamp('director_approved_at')->nullable()->after('approved_at')->comment('Date d\'approbation par le directeur');
            $table->foreignId('director_approved_by_user_id')->nullable()->after('director_approved_at')->constrained('users')->onDelete('set null');
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE material_requests MODIFY COLUMN status ENUM(
                'draft','submitted','pending_director','director_approved','in_treatment','approved','aggregated','partially_received','received','cancelled','delivered'
            ) DEFAULT 'draft'");
        }
    }

    public function down(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->dropForeign(['transmitted_by_user_id']);
            $table->dropForeign(['director_approved_by_user_id']);
            $table->dropColumn(['transmitted_at', 'transmitted_by_user_id', 'director_approved_at', 'director_approved_by_user_id']);
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE material_requests MODIFY COLUMN status ENUM(
                'draft','submitted','in_treatment','approved','aggregated','partially_received','received','cancelled','delivered'
            ) DEFAULT 'draft'");
        }
    }
};
