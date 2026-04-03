<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Module demandes de matériel : objet, motif, service/département, notes de traitement.
     */
    public function up(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->string('subject', 255)->nullable()->after('notes')->comment('Objet de la demande');
            $table->text('justification')->nullable()->after('subject')->comment('Motif / justification');
            $table->foreignId('department_id')->nullable()->after('campus_id')->constrained('departments')->onDelete('set null')->comment('Service ou département');
            $table->text('treatment_notes')->nullable()->after('rejection_reason')->comment('Commentaire ou observation du point focal');
        });

        // Ajouter les statuts in_treatment et delivered (MySQL uniquement ; SQLite stocke en texte)
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE material_requests MODIFY COLUMN status ENUM(
                'draft','submitted','in_treatment','approved','aggregated','partially_received','received','cancelled','delivered'
            ) DEFAULT 'draft'");
        }
    }

    public function down(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn(['subject', 'justification', 'department_id', 'treatment_notes']);
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE material_requests MODIFY COLUMN status ENUM(
                'draft','submitted','approved','aggregated','partially_received','received','cancelled'
            ) DEFAULT 'draft'");
        }
    }
};
