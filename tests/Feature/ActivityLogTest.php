<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Article;
use App\Models\Facture;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create(['name' => 'Alice'])->assignRole('Administrateur');
        $this->actingAs($this->admin);
    }

    public function test_creating_a_record_stores_author_and_logs_it(): void
    {
        $this->post(route('articles.store'), ['description' => 'Gants']);

        $article = Article::firstOrFail();
        $this->assertSame($this->admin->id, $article->created_by);
        $this->assertSame($this->admin->id, $article->updated_by);
        $this->assertDatabaseHas('activity_logs', [
            'event' => 'created', 'subject_type' => 'Article', 'subject_id' => $article->id,
            'user_id' => $this->admin->id, 'user_name' => 'Alice', 'label' => 'Gants',
        ]);
    }

    public function test_update_logs_old_and_new_values_and_updates_the_editor(): void
    {
        $article = Article::create(['description' => 'Gants']);
        $bob = User::factory()->create(['name' => 'Bob'])->assignRole('Administrateur');
        $this->actingAs($bob);

        $this->put(route('articles.update', $article), ['description' => 'Gants nitrile']);

        $this->assertSame($bob->id, $article->fresh()->updated_by);
        $log = ActivityLog::where('event', 'updated')->firstOrFail();
        $this->assertSame(['description' => 'Gants'], $log->old_values);
        $this->assertSame(['description' => 'Gants nitrile'], $log->new_values);
        $this->assertSame('Bob', $log->user_name);
    }

    public function test_saving_without_changes_does_not_log(): void
    {
        $article = Article::create(['description' => 'Gants']);
        ActivityLog::query()->delete();

        $this->put(route('articles.update', $article), ['description' => 'Gants']);

        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_deletion_is_logged_with_the_previous_values(): void
    {
        $facture = Facture::create(['numero_facture' => 'F-9', 'montant' => 10]);
        $this->delete(route('factures.destroy', $facture));

        $log = ActivityLog::where('event', 'deleted')->firstOrFail();
        $this->assertSame('F-9', $log->label);
        $this->assertSame('F-9', $log->old_values['numero_facture']);
    }

    public function test_login_and_logout_are_logged(): void
    {
        event(new Login('web', $this->admin, false));
        event(new Logout('web', $this->admin));

        $this->assertDatabaseHas('activity_logs', ['event' => 'login', 'user_id' => $this->admin->id]);
        $this->assertDatabaseHas('activity_logs', ['event' => 'logout', 'user_id' => $this->admin->id]);
    }

    public function test_only_administrators_can_open_the_journal(): void
    {
        Article::create(['description' => 'Gants']);

        $this->get(route('admin.journal.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Journal/Index')->has('logs.data', 1)->where('logs.data.0.event', 'created'));

        $this->get(route('admin.journal.index', ['event' => 'deleted']))
            ->assertInertia(fn (Assert $page) => $page->has('logs.data', 0));

        $this->actingAs(User::factory()->create());
        $this->get(route('admin.journal.index'))->assertForbidden();
    }
}
