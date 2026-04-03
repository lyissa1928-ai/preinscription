<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Ajoute les actions transmitted_to_director et director_approved à l'enum action (workflow directeur).
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            // MySQL/PostgreSQL : modifier l'enum
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE activity_logs MODIFY COLUMN action ENUM(
                'created', 'updated', 'deleted', 'approved', 'rejected', 'submitted',
                'aggregated', 'received', 'cancelled', 'custom',
                'transmitted_to_director', 'director_approved', 'director_rejected'
            ) NOT NULL");
            return;
        }

        // SQLite : recréer la table avec action en string (plus de CHECK enum) pour accepter toutes les actions
        Schema::create('activity_logs_new', function (Blueprint $table) {
            $table->id();
            $table->string('loggable_type');
            $table->unsignedBigInteger('loggable_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 50);
            $table->json('changes')->nullable();
            $table->string('description')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['loggable_type', 'loggable_id']);
            $table->index(['user_id', 'created_at']);
            $table->index('action');
        });

        \Illuminate\Support\Facades\DB::statement("
            INSERT INTO activity_logs_new (id, loggable_type, loggable_id, user_id, action, changes, description, ip_address, user_agent, created_at)
            SELECT id, loggable_type, loggable_id, user_id, action, changes, description, ip_address, user_agent, created_at
            FROM activity_logs
        ");

        Schema::drop('activity_logs');
        Schema::rename('activity_logs_new', 'activity_logs');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::rename('activity_logs', 'activity_logs_new');
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->string('loggable_type');
                $table->unsignedBigInteger('loggable_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->enum('action', [
                    'created', 'updated', 'deleted', 'approved', 'rejected', 'submitted',
                    'aggregated', 'received', 'cancelled', 'custom'
                ]);
                $table->json('changes')->nullable();
                $table->string('description')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamp('created_at')->nullable();
                $table->index(['loggable_type', 'loggable_id']);
                $table->index(['user_id', 'created_at']);
                $table->index('action');
            });
            \Illuminate\Support\Facades\DB::statement("
                INSERT INTO activity_logs (id, loggable_type, loggable_id, user_id, action, changes, description, ip_address, user_agent, created_at)
                SELECT id, loggable_type, loggable_id, user_id, action, changes, description, ip_address, user_agent, created_at
                FROM activity_logs_new
                WHERE action IN ('created','updated','deleted','approved','rejected','submitted','aggregated','received','cancelled','custom')
            ");
            Schema::drop('activity_logs_new');
        }
    }
};
