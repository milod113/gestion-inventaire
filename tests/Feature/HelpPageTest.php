<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HelpPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_any_signed_in_user_can_open_the_help_page(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create()->syncRoles(['Consultation']);

        $this->actingAs($user)
            ->get(route('help'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Help/Index'));
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get(route('help'))->assertRedirect(route('login'));
    }
}
