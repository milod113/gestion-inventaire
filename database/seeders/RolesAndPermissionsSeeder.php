<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'dashboard.view',
            'services.view', 'services.create', 'services.update', 'services.delete',
            'articles.view', 'articles.create', 'articles.update', 'articles.delete',
            'factures.view', 'factures.create', 'factures.update', 'factures.delete',
            'fournisseurs.view', 'fournisseurs.create', 'fournisseurs.update', 'fournisseurs.delete',
            'imports.view', 'imports.run',
            'backups.run',
            'users.manage', 'roles.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $administrator = Role::findOrCreate('Administrateur', 'web');
        $administrator->syncPermissions(Permission::all());

        $manager = Role::findOrCreate('Gestionnaire', 'web');
        $manager->syncPermissions([
            'dashboard.view',
            'services.view', 'services.create', 'services.update',
            'articles.view', 'articles.create', 'articles.update',
            'factures.view', 'factures.create', 'factures.update',
            'fournisseurs.view', 'fournisseurs.create', 'fournisseurs.update',
            'imports.view', 'imports.run',
            'backups.run',
        ]);

        $viewer = Role::findOrCreate('Consultation', 'web');
        $viewer->syncPermissions([
            'dashboard.view',
            'services.view', 'articles.view', 'factures.view', 'fournisseurs.view',
        ]);

        User::query()->doesntHave('roles')->each(function (User $user) use ($administrator): void {
            $user->assignRole($administrator);
        });
    }
}
