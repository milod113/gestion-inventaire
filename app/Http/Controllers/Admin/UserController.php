<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $role = $request->string('role')->trim()->value();
        $status = $request->string('status')->trim()->value();

        return Inertia::render('Admin/Users/Index', [
            'users' => User::query()
                ->with('roles:id,name')
                ->when($search, fn ($query) => $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")))
                ->when($role, fn ($query) => $query->role($role))
                ->when($status === 'active', fn ($query) => $query->where('is_active', true))
                ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
                ->latest()
                ->paginate(20)
                ->withQueryString(),
            'roles' => Role::query()->orderBy('name')->pluck('name'),
            'filters' => compact('search', 'role', 'status'),
            'summary' => [
                'total' => User::count(),
                'active' => User::where('is_active', true)->count(),
                'administrators' => User::role('Administrateur')->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Users/Create', ['roles' => $this->roles()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request, true);
        $role = $data['role'];
        unset($data['role']);
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);
        $user->assignRole($role);

        return redirect()->route('admin.users.index')->with('success', 'Utilisateur cree avec succes.');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('Admin/Users/Edit', [
            'managedUser' => $user->load('roles:id,name'),
            'roles' => $this->roles(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $this->validated($request, false, $user);
        $role = $data['role'];
        unset($data['role']);

        if ($request->user()->is($user) && ($role !== 'Administrateur' || ! $data['is_active'])) {
            return back()->with('error', 'Vous ne pouvez pas retirer votre propre acces administrateur.');
        }

        if ($this->isLastAdministrator($user) && ($role !== 'Administrateur' || ! $data['is_active'])) {
            return back()->with('error', 'Au moins un compte administrateur actif doit etre conserve.');
        }

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $user->syncRoles($role);

        return redirect()->route('admin.users.index')->with('success', 'Utilisateur mis a jour avec succes.');
    }

    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            return back()->with('error', 'Vous ne pouvez pas desactiver votre propre compte.');
        }

        if ($user->is_active && $this->isLastAdministrator($user)) {
            return back()->with('error', 'Le dernier administrateur actif ne peut pas etre desactive.');
        }

        $user->update(['is_active' => ! $user->is_active]);

        return back()->with('success', $user->is_active ? 'Compte active.' : 'Compte desactive.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            return back()->with('error', 'Vous ne pouvez pas supprimer votre propre compte.');
        }

        if ($this->isLastAdministrator($user)) {
            return back()->with('error', 'Le dernier administrateur ne peut pas etre supprime.');
        }

        $user->syncRoles([]);
        $user->delete();

        return redirect()->route('admin.users.index')->with('success', 'Utilisateur supprime.');
    }

    private function roles(): array
    {
        return Role::query()->orderBy('name')->pluck('name')->all();
    }

    private function isLastAdministrator(User $user): bool
    {
        return $user->hasRole('Administrateur') && User::role('Administrateur')->where('is_active', true)->count() <= 1;
    }

    private function validated(Request $request, bool $creating, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'password' => [$creating ? 'required' : 'nullable', 'confirmed', 'min:8'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
