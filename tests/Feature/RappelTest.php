<?php

namespace Tests\Feature;

use App\Models\Facture;
use App\Models\Rappel;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RappelTest extends TestCase
{
    use RefreshDatabase;

    private User $me;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->me = User::factory()->create(['name' => 'Anas'])->assignRole('Comptable');
        $this->actingAs($this->me);
    }

    private function rappel(array $attributes = []): Rappel
    {
        $rappel = new Rappel(['texte' => 'Relancer', 'echeance' => today(), 'assigne_a' => $this->me->id, ...$attributes]);
        $rappel->user_id = $attributes['user_id'] ?? $this->me->id;
        $rappel->save();

        return $rappel;
    }

    public function test_a_reminder_linked_to_an_invoice_is_shown_on_the_invoice_and_in_the_bell(): void
    {
        $facture = Facture::create(['numero_facture' => '015']);

        $this->post(route('rappels.store'), [
            'texte' => 'Relancer le fournisseur', 'echeance' => today()->format('Y-m-d'), 'heure' => '14:30',
            'rappelable_type' => 'facture', 'rappelable_id' => $facture->id,
        ])->assertRedirect()->assertSessionHasNoErrors();

        $rappel = Rappel::firstOrFail();
        $this->assertSame($this->me->id, $rappel->assigne_a);
        $this->assertSame('facture', $rappel->rappelable_type);

        $this->get(route('factures.show', $facture))->assertInertia(fn (Assert $page) => $page
            ->has('rappels', 1)
            ->where('rappels.0.fiche.label', 'Facture 015')
            ->where('rappels.0.heure', '14:30')
            ->where('rappels_a_echeance', 1));

        $this->getJson(route('rappels.cloche'))->assertOk()
            ->assertJsonPath('a_echeance', 1)
            ->assertJsonPath('rappels.0.fiche.url', route('factures.show', $facture));
    }

    public function test_a_reminder_can_be_assigned_to_a_colleague_who_sees_and_completes_it(): void
    {
        $colleague = User::factory()->create(['name' => 'Mohamed'])->assignRole('Gestionnaire');

        $this->post(route('rappels.store'), ['texte' => 'Inventaire service 43', 'echeance' => today()->addDay()->format('Y-m-d'), 'assigne_a' => $colleague->id])
            ->assertSessionHas('success', 'Rappel cree et assigne a Mohamed.');
        $rappel = Rappel::firstOrFail();

        // L'auteur le retrouve dans "Confies a des collegues", pas dans "Pour moi".
        $this->get(route('rappels.index'))->assertInertia(fn (Assert $page) => $page->component('Rappels/Index')->has('rappels', 0));
        $this->get(route('rappels.index', ['vue' => 'assignes']))->assertInertia(fn (Assert $page) => $page
            ->has('rappels', 1)->where('rappels.0.assigne.name', 'Mohamed'));

        // Le collegue le voit, le termine, mais ne peut ni le modifier ni le supprimer.
        $this->actingAs($colleague);
        $this->get(route('rappels.index'))->assertInertia(fn (Assert $page) => $page
            ->has('rappels', 1)->where('rappels.0.auteur.name', 'Anas')->where('rappels.0.peut_modifier', false));
        $this->put(route('rappels.update', $rappel), ['texte' => 'X', 'echeance' => today()->format('Y-m-d')])->assertForbidden();
        $this->delete(route('rappels.destroy', $rappel))->assertForbidden();
        $this->patch(route('rappels.terminer', $rappel))->assertRedirect();

        $rappel->refresh();
        $this->assertNotNull($rappel->termine_at);
        $this->assertSame($colleague->id, $rappel->termine_par);

        $this->actingAs($this->me);
        $this->get(route('rappels.index', ['vue' => 'assignes', 'onglet' => 'termines']))->assertInertia(fn (Assert $page) => $page
            ->has('rappels', 1)->where('rappels.0.termine_par', 'Mohamed'));
    }

    public function test_tabs_split_upcoming_late_and_done_reminders(): void
    {
        $this->rappel(['texte' => 'Aujourd hui']);
        $this->rappel(['texte' => 'Hier', 'echeance' => today()->subDay()]);
        $this->rappel(['texte' => 'Fait'])->forceFill(['termine_at' => now()])->save();

        $this->get(route('rappels.index'))->assertInertia(fn (Assert $page) => $page
            ->where('compteurs', ['a_venir' => 1, 'retard' => 1, 'termines' => 1])
            ->where('rappels.0.texte', 'Aujourd hui')
            ->where('rappels_a_echeance', 2));
        $this->get(route('rappels.index', ['onglet' => 'retard']))->assertInertia(fn (Assert $page) => $page->where('rappels.0.texte', 'Hier'));
    }

    public function test_reminders_can_be_postponed_reopened_and_are_private(): void
    {
        $rappel = $this->rappel(['echeance' => today()->subDays(3)]);

        $this->patch(route('rappels.reporter', $rappel), ['jours' => 7])->assertRedirect();
        $this->assertSame(today()->addDays(7)->format('Y-m-d'), $rappel->fresh()->echeance->format('Y-m-d'));
        $this->patch(route('rappels.reporter', $rappel), ['jours' => 30])->assertSessionHasErrors('jours');

        $this->patch(route('rappels.terminer', $rappel));
        $this->patch(route('rappels.terminer', $rappel));
        $this->assertNull($rappel->fresh()->termine_at);

        $stranger = User::factory()->create()->assignRole('Administrateur');
        $this->actingAs($stranger);
        $this->patch(route('rappels.terminer', $rappel))->assertForbidden();
        $this->get(route('rappels.index'))->assertInertia(fn (Assert $page) => $page->has('rappels', 0));
        $this->getJson(route('rappels.cloche'))->assertJsonPath('a_echeance', 0);
    }

    public function test_validation_rejects_missing_text_unknown_records_and_inactive_colleagues(): void
    {
        $inactive = User::factory()->create(['is_active' => false]);

        $this->post(route('rappels.store'), ['texte' => '', 'echeance' => ''])->assertSessionHasErrors(['texte', 'echeance']);
        $this->post(route('rappels.store'), ['texte' => 'X', 'echeance' => today()->format('Y-m-d'), 'rappelable_type' => 'facture', 'rappelable_id' => 999])->assertSessionHasErrors('rappelable_id');
        $this->post(route('rappels.store'), ['texte' => 'X', 'echeance' => today()->format('Y-m-d'), 'assigne_a' => $inactive->id])->assertSessionHasErrors('assigne_a');
        $this->assertDatabaseCount('rappels', 0);
    }

    public function test_dashboard_lists_my_next_reminders(): void
    {
        $this->rappel(['texte' => 'Premier']);
        $this->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page->has('rappels', 1)->where('rappels.0.texte', 'Premier'));
    }
}
