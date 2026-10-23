<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhoneLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_phone_numbers_are_stored_in_a_canonical_form(): void
    {
        foreach (['0555 12 34 56', '0555-12-34-56', '+213 555 12 34 56', '00213555123456', '0555.123.456'] as $typed) {
            $this->assertSame('0555123456', User::normalizePhone($typed), $typed);
        }
        $this->assertNull(User::normalizePhone(''));
        $this->assertNull(User::normalizePhone('abc'));
        $this->assertSame('0555123456', User::factory()->create(['telephone' => '+213 555 12 34 56'])->telephone);
    }

    public function test_user_can_log_in_with_a_phone_number_in_any_format(): void
    {
        $user = User::factory()->create(['telephone' => '0555 12 34 56']);

        foreach (['0555123456', '0555 12 34 56', '+213555123456'] as $typed) {
            $this->post('/login', ['email' => $typed, 'password' => 'password'])->assertRedirect();
            $this->assertAuthenticatedAs($user);
            $this->post('/logout');
        }
    }

    public function test_email_login_still_works(): void
    {
        $user = User::factory()->create();

        $this->post('/login', ['email' => $user->email, 'password' => 'password']);

        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_or_unknown_phone_is_rejected(): void
    {
        User::factory()->create(['telephone' => '0555123456']);
        $withoutPhone = User::factory()->create(['telephone' => null]);

        $this->post('/login', ['email' => '0555123456', 'password' => 'wrong'])->assertSessionHasErrors('email');
        $this->post('/login', ['email' => '0666000000', 'password' => 'password'])->assertSessionHasErrors('email');
        // Text that is neither an e-mail nor a number must not match accounts that have no phone.
        $this->post('/login', ['email' => 'abc', 'password' => 'password'])->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertNull($withoutPhone->telephone);
    }

    public function test_inactive_account_cannot_log_in_with_phone(): void
    {
        User::factory()->create(['telephone' => '0555123456', 'is_active' => false]);

        $this->post('/login', ['email' => '0555123456', 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_admin_sets_phone_and_duplicates_are_refused(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create()->assignRole('Administrateur');
        User::factory()->create(['telephone' => '0555123456']);
        $payload = ['name' => 'Nouveau', 'email' => 'nouveau@example.com', 'password' => 'password123', 'password_confirmation' => 'password123', 'role' => 'Consultation', 'is_active' => true];

        $this->actingAs($admin)->post(route('admin.users.store'), [...$payload, 'telephone' => '+213 555 12 34 56'])->assertSessionHasErrors('telephone');
        $this->actingAs($admin)->post(route('admin.users.store'), [...$payload, 'telephone' => '0770 11 22 33'])->assertSessionDoesntHaveErrors();

        $this->assertSame('0770112233', User::where('email', 'nouveau@example.com')->value('telephone'));
        $this->actingAs($admin)->post(route('admin.users.store'), [...$payload, 'email' => 'x@example.com', 'telephone' => 'abc'])->assertSessionHasErrors('telephone');
    }
}
