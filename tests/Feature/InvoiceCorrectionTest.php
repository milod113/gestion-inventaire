<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Article;
use App\Models\Facture;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InvoiceCorrectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function importedInvoice(): Facture
    {
        return Facture::create(['source' => 'import', 'numero_facture' => 'F-100', 'montant' => 1000, 'code_fournisseur' => 'PR.401']);
    }

    private function payload(Facture $facture, array $changes = []): array
    {
        return [...$facture->only(Facture::CHAMPS_CORRIGEABLES), ...$changes];
    }

    public function test_only_users_allowed_to_correct_can_edit_an_imported_invoice(): void
    {
        $facture = $this->importedInvoice();

        $this->actingAs(User::factory()->create()->assignRole('Gestionnaire'));
        $this->get(route('factures.edit', $facture))->assertRedirect(route('factures.index'));
        $this->put(route('factures.update', $facture), $this->payload($facture, ['montant' => 1200, 'motif_correction' => 'erreur_montant']))->assertRedirect(route('factures.index'));
        $this->assertSame('1000.00', $facture->fresh()->montant);

        $this->actingAs(User::factory()->create()->assignRole('Comptable'));
        $this->get(route('factures.edit', $facture))->assertInertia(fn (Assert $page) => $page
            ->component('Factures/Edit')->where('motifs.rejet_cf', 'Rejet du controle financier (CF)'));
    }

    public function test_a_correction_requires_a_motif_and_a_precision_for_other(): void
    {
        $facture = $this->importedInvoice();
        $this->actingAs(User::factory()->create()->assignRole('Comptable'));

        $this->put(route('factures.update', $facture), $this->payload($facture, ['montant' => 1200]))->assertSessionHasErrors('motif_correction');
        $this->put(route('factures.update', $facture), $this->payload($facture, ['montant' => 1200, 'motif_correction' => 'autre']))->assertSessionHasErrors('motif_precision');
        $this->assertSame('1000.00', $facture->fresh()->montant);
        $this->assertNull($facture->fresh()->corrigee_at);
    }

    public function test_correction_keeps_the_first_imported_value_and_logs_the_motif(): void
    {
        $facture = $this->importedInvoice();
        \App\Models\Fournisseur::create(['code' => 'PR.900', 'appellation' => 'Nouveau fournisseur']);
        $this->actingAs(User::factory()->create(['name' => 'Agent CF'])->assignRole('Comptable'));

        $this->put(route('factures.update', $facture), $this->payload($facture, ['montant' => 1200, 'motif_correction' => 'rejet_cf']))
            ->assertRedirect(route('factures.show', $facture));
        $this->put(route('factures.update', $facture), $this->payload($facture, ['montant' => 1300, 'code_fournisseur' => 'PR.900', 'motif_correction' => 'autre', 'motif_precision' => 'Avoir du fournisseur']))
            ->assertRedirect(route('factures.show', $facture));

        $facture->refresh();
        $this->assertSame('1300.00', $facture->montant);
        $this->assertSame(['montant' => '1000.00', 'code_fournisseur' => 'PR.401'], $facture->valeurs_origine);
        $this->assertTrue($facture->isCorrigee());
        $this->assertSame('import', $facture->source);

        $logs = ActivityLog::where('subject_type', 'Facture')->where('event', 'updated')->orderBy('id')->get();
        $this->assertSame(['Rejet du controle financier (CF)', 'Autre : Avoir du fournisseur'], $logs->pluck('motif')->all());
        $this->assertSame('1000.00', $logs[0]->old_values['montant']);
        $this->assertEquals(1200, $logs[0]->new_values['montant']);
        $this->assertSame('Agent CF', $logs[0]->user_name);

        $this->get(route('factures.show', $facture))->assertInertia(fn (Assert $page) => $page
            ->component('Factures/Show')->has('historique', 3)->where('historique.0.motif', 'Autre : Avoir du fournisseur')->where('historique.2.event', 'created'));
    }

    public function test_a_correction_without_any_change_is_rejected(): void
    {
        $facture = $this->importedInvoice();
        $this->actingAs(User::factory()->create()->assignRole('Comptable'));

        $this->put(route('factures.update', $facture), $this->payload($facture, ['motif_correction' => 'erreur_montant']))->assertSessionHas('error');
        $this->assertNull($facture->fresh()->corrigee_at);
        $this->assertSame(0, ActivityLog::where('event', 'updated')->count());
    }

    public function test_manual_invoices_are_still_edited_without_motif(): void
    {
        $this->actingAs(User::factory()->create()->assignRole('Gestionnaire'));
        $facture = Facture::create(['numero_facture' => 'F-1', 'montant' => 10]);

        $this->put(route('factures.update', $facture), ['numero_facture' => 'F-1', 'montant' => 20])->assertRedirect(route('factures.index'));
        $this->assertSame('20.00', $facture->fresh()->montant);
        $this->assertNull($facture->fresh()->corrigee_at);
    }

    public function test_invoice_service_is_limited_to_the_four_services(): void
    {
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));
        $this->get(route('factures.create'))->assertInertia(fn (Assert $page) => $page
            ->component('Factures/Create')->where('services', ['D.I.E.' => 'DIE', 'DMM' => 'DMM', 'PHARMACIE' => 'Pharmacie', 'ECONOMAT' => 'Economat']));

        $this->post(route('factures.store'), ['numero_facture' => 'F-9', 'service_reference' => 'URGENCES'])->assertSessionHasErrors('service_reference');
        $this->post(route('factures.store'), ['numero_facture' => 'F-9', 'service_reference' => 'D.I.E.'])->assertRedirect();
        $this->assertDatabaseHas('factures', ['numero_facture' => 'F-9', 'service_reference' => 'D.I.E.', 'service_reference_normalisee' => 'D.I.E.']);

        // Une ancienne reference importee reste valide tant qu'elle n'est pas changee.
        $legacy = Facture::create(['source' => 'import', 'numero_facture' => 'F-10', 'service_reference' => 'ECONOMET', 'service_reference_normalisee' => 'ECONOMAT']);
        $this->put(route('factures.update', $legacy), [...$this->payload($legacy, ['numero_facture' => 'F-10B']), 'motif_correction' => 'autre', 'motif_precision' => 'Numero errone'])->assertRedirect(route('factures.show', $legacy));
        $this->assertSame('ECONOMET', $legacy->fresh()->service_reference);
        $this->assertSame(['numero_facture' => 'F-10'], $legacy->fresh()->valeurs_origine);
    }

    public function test_adding_moving_and_removing_articles_is_recorded_in_the_invoice_history(): void
    {
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));
        $first = Facture::create(['numero_facture' => 'F-1']);
        $second = Facture::create(['numero_facture' => 'F-2']);

        $this->post(route('factures.details.store', $first), ['description' => 'Chaise', 'numero_inventaire' => '500'])->assertRedirect();
        $article = Article::firstOrFail();
        $this->put(route('articles.update', $article), ['description' => 'Chaise', 'numero_inventaire' => '500', 'facture_id' => $second->id])->assertRedirect();
        $this->put(route('articles.update', $article), ['description' => 'Chaise', 'numero_inventaire' => '500', 'facture_id' => null])->assertRedirect();

        $events = fn (Facture $facture) => ActivityLog::where('subject_type', 'Facture')->where('subject_id', $facture->id)
            ->whereIn('event', ['article_added', 'article_removed'])->orderBy('id')->pluck('event')->all();
        $this->assertSame(['article_added', 'article_removed'], $events($first));
        $this->assertSame(['article_added', 'article_removed'], $events($second));

        $added = ActivityLog::where('subject_id', $first->id)->where('event', 'article_added')->firstOrFail();
        $this->assertSame(['article_id' => $article->id, 'article' => 'Chaise', 'numero_inventaire' => '500'], $added->new_values);

        $article->detailFacture()->create(['facture_id' => $first->id]);
        $this->delete(route('articles.destroy', $article))->assertRedirect();
        $this->assertSame(['article_added', 'article_removed', 'article_added', 'article_removed'], $events($first));
        $this->assertDatabaseCount('details_factures', 0);
    }
}
