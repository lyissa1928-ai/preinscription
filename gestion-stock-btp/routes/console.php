<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use App\Models\User;
use App\Models\Campus;

Artisan::command('esebat:demo-users', function () {
    $this->info('Création des comptes de démonstration (un par profil)...');

    if (! class_exists(\Spatie\Permission\Models\Role::class)) {
        $this->error('Spatie Permission non installé. Lancez: php artisan db:seed --class=RolesAndPermissionsSeeder');
        return 1;
    }

    $campuses = Campus::all();
    $firstCampusId = $campuses->isNotEmpty() ? $campuses->first()->id : null;
    if (! $firstCampusId) {
        $this->warn('Aucun campus. Lancez d\'abord: php artisan db:seed (ou créez un campus).');
    }

    $password = 'password';
    $accounts = [
        ['role' => 'director',   'email' => 'director@esebat.local',   'name' => 'Directeur',        'campus_id' => null],
        ['role' => 'point_focal','email' => 'point_focal@esebat.local','name' => 'Point Focal',      'campus_id' => null],
        ['role' => 'campus_manager','email' => 'campus_manager@esebat.local','name' => 'Responsable Campus', 'campus_id' => $firstCampusId],
        ['role' => 'site_manager','email' => 'site_manager@esebat.local','name' => 'Responsable Site',   'campus_id' => $firstCampusId],
        ['role' => 'staff',      'email' => 'staff@esebat.local',     'name' => 'Personnel',        'campus_id' => $firstCampusId],
        ['role' => 'technician', 'email' => 'technician@esebat.local', 'name' => 'Technicien',      'campus_id' => $firstCampusId],
    ];

    foreach ($accounts as $account) {
        $user = User::firstOrNew(['email' => $account['email']]);
        $user->name = $account['name'];
        $user->password = $password;
        $user->email_verified_at = $user->email_verified_at ?? now();
        if (Schema::hasColumn('users', 'campus_id')) {
            $user->campus_id = $account['campus_id'];
        }
        if (Schema::hasColumn('users', 'is_active')) {
            $user->is_active = true;
        }
        $user->save();

        $role = \Spatie\Permission\Models\Role::where('name', $account['role'])->first();
        if ($role) {
            $user->syncRoles([$account['role']]);
        }

        $this->line('  ✓ ' . $account['role'] . ': ' . $account['email']);
    }

    $this->newLine();
    $this->info('Tous les comptes utilisent le mot de passe: password');
    return 0;
})->purpose('Créer un compte de démo par profil (director, point_focal, campus_manager, site_manager, staff, technician).');

Artisan::command('esebat:admin', function () {
    $this->info('Création / mise à jour du compte administrateur...');

    if (! class_exists(\Spatie\Permission\Models\Role::class)) {
        $this->error('Spatie Permission non installé. Lancez: php artisan db:seed --class=RolesAndPermissionsSeeder');
        return 1;
    }

    // Créer les rôles et permissions s'ils n'existent pas
    $director = \Spatie\Permission\Models\Role::firstOrCreate(
        ['name' => 'director', 'guard_name' => 'web'],
        ['description' => 'System Administrator - Full Access']
    );
    if ($director->permissions()->count() === 0) {
        $this->warn('Rôles vides. Lancez d\'abord: php artisan db:seed --class=RolesAndPermissionsSeeder');
    }

    $user = \App\Models\User::firstOrNew(['email' => 'admin@esebat.local']);
    $user->name = 'Administrateur';
    $user->password = 'password'; // le cast 'hashed' du modèle User le hache
    $user->email_verified_at = $user->email_verified_at ?? now();
    if (Schema::hasColumn('users', 'campus_id')) {
        $user->campus_id = null;
    }
    if (Schema::hasColumn('users', 'is_active')) {
        $user->is_active = true;
    }
    $user->save();

    if (! $user->hasRole('director')) {
        $user->assignRole('director');
    }

    $this->info('Compte admin prêt.');
    $this->line('  Email: admin@esebat.local');
    $this->line('  Mot de passe: password');
    return 0;
})->purpose('Créer ou réinitialiser le compte admin (director) pour la connexion.');

Artisan::command('esebat:super-admin', function () {
    $this->info('Création / récupération du compte Super Admin...');

    if (! class_exists(\Spatie\Permission\Models\Role::class)) {
        $this->error('Spatie Permission non installé. Lancez: php artisan db:seed --class=RolesAndPermissionsSeeder');
        return 1;
    }

    $superAdminRole = \Spatie\Permission\Models\Role::firstOrCreate(
        ['name' => 'super_admin', 'guard_name' => 'web'],
        ['description' => 'Super Administrateur']
    );

    $user = User::firstOrNew(['email' => 'issa.ly@esebat.com']);
    $user->name = 'Super Admin';
    $user->first_name = $user->first_name ?? 'Issa';
    $user->last_name = $user->last_name ?? 'Ly';
    $user->password = 'Admin@2020';
    $user->email_verified_at = $user->email_verified_at ?? now();
    if (Schema::hasColumn('users', 'campus_id')) {
        $user->campus_id = null;
    }
    if (Schema::hasColumn('users', 'is_active')) {
        $user->is_active = true;
    }
    if (Schema::hasColumn('users', 'matricule') && empty($user->matricule)) {
        $user->matricule = User::generateMatriculeForRole('super_admin');
    }
    $user->save();

    if (! $user->hasRole('super_admin')) {
        $user->assignRole('super_admin');
    }

    $this->info('Compte Super Admin prêt / récupéré.');
    $this->line('  Email: issa.ly@esebat.com');
    $this->line('  Mot de passe: Admin@2020');
    $this->warn('  Changez le mot de passe après la première connexion en production.');
    return 0;
})->purpose('Créer ou récupérer le compte Super Admin (issa.ly@esebat.com).');
