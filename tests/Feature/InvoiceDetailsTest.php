<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Facture;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\QueryException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InvoiceDetailsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));
    }

    public function test_creating_an_invoice_redirects_to_its_details(): void
    {
        $response = $this->post(route('factures.store'), ['numero_facture' => 'F-2026']);
        $response->assertRedirect(route('factures.show', Facture::latest('id')->firstOrFail()));
    }

    public function test_adding_details_from_an_invoice_always_links_to_that_invoice(): void
    {
        $facture = Facture::create(['numero_facture' => 'F-1']);
        $other = Facture::create(['numero_facture' => 'F-2']);
        $this->get(route('factures.details.create', $facture))->assertInertia(fn (Assert $page) => $page
            ->component('Articles/Create')->where('factureContext.id', $facture->id)->where('factureId', $facture->id));
        $this->post(route('factures.details.store', $facture), [
            'description' => 'Detail de F-1', 'prix_unitaire' => null, 'facture_id' => $other->id,
        ])->assertRedirect(route('factures.show', $facture));
        $this->assertDatabaseHas('details_factures', ['facture_id' => $facture->id, 'article_id' => Article::firstOrFail()->id]);
        $this->assertDatabaseMissing('details_factures', ['facture_id' => $other->id]);

        $this->actingAs(User::factory()->create()->assignRole('Consultation'));
        $this->get(route('factures.details.create', $facture))->assertForbidden();
        $this->post(route('factures.details.store', $facture), ['description' => 'Interdit'])->assertForbidden();
    }

    public function test_creating_an_article_links_it_and_shows_its_price_on_the_invoice(): void
    {
        $facture = Facture::create(['numero_facture' => 'F-1', 'montant' => 500]);
        $this->get(route('articles.create', ['facture_id' => $facture->id]))
            ->assertInertia(fn (Assert $page) => $page->component('Articles/Create')->where('factureId', (string) $facture->id));
        $this->post(route('articles.store'), [
            'description' => 'Chaise', 'facture_id' => $facture->id, 'prix_unitaire' => '125.50', 'quantite_entree' => 2,
        ])->assertRedirect(route('factures.show', $facture));
        $article = Article::firstOrFail();
        $this->assertSame('125.50', $article->prix_unitaire);
        $this->assertDatabaseHas('details_factures', ['facture_id' => $facture->id, 'article_id' => $article->id]);
        $this->get(route('factures.show', $facture))->assertInertia(fn (Assert $page) => $page
            ->component('Factures/Show')->where('details.total', 1)->where('details.data.0.article.prix_unitaire', '125.50'));
        $this->assertSame('500.00', $facture->fresh()->montant);
    }

    public function test_articles_can_still_be_created_without_invoice_or_price_and_zero_is_preserved(): void
    {
        $this->post(route('articles.store'), ['description' => 'Ancien parcours'])->assertRedirect(route('articles.index'));
        $this->assertNull(Article::firstOrFail()->prix_unitaire);
        $this->assertDatabaseCount('details_factures', 0);
        $this->post(route('articles.store'), ['description' => 'Don', 'prix_unitaire' => '0'])->assertRedirect();
        $this->assertSame('0.00', Article::latest('id')->firstOrFail()->prix_unitaire);
    }

    public function test_invalid_invoice_or_price_does_not_create_an_article(): void
    {
        foreach ([['facture_id' => 99999], ['prix_unitaire' => -1], ['prix_unitaire' => '1.234']] as $invalid) {
            $this->post(route('articles.store'), ['description' => 'Invalid', ...$invalid])->assertSessionHasErrors(array_keys($invalid));
        }
        $this->assertDatabaseCount('articles', 0);
        $this->assertDatabaseCount('details_factures', 0);
    }

    public function test_existing_articles_can_be_linked_reassigned_and_unlinked_without_duplication(): void
    {
        $article = Article::create(['description' => 'Bureau']);
        $first = Facture::create(['numero_facture' => 'F-1']);
        $second = Facture::create(['numero_facture' => 'F-2']);
        foreach ([$first->id, $second->id] as $factureId) {
            $this->put(route('articles.update', $article), ['description' => 'Bureau', 'facture_id' => $factureId, 'prix_unitaire' => null])->assertRedirect();
            $this->assertDatabaseCount('details_factures', 1);
            $this->assertDatabaseHas('details_factures', ['article_id' => $article->id, 'facture_id' => $factureId]);
        }
        $this->put(route('articles.update', $article), ['description' => 'Bureau', 'facture_id' => null])->assertRedirect();
        $this->assertDatabaseCount('details_factures', 0);
        $this->assertDatabaseHas('articles', ['id' => $article->id, 'prix_unitaire' => null]);
    }

    public function test_linked_invoice_cannot_be_deleted_and_deleting_article_removes_only_its_link(): void
    {
        $facture = Facture::create(['numero_facture' => 'F-1']);
        $article = Article::create(['description' => 'Chaise']);
        $article->detailFacture()->create(['facture_id' => $facture->id]);
        $this->from(route('factures.show', $facture))->delete(route('factures.destroy', $facture))
            ->assertRedirect(route('factures.show', $facture))->assertSessionHas('error');
        $this->assertDatabaseHas('factures', ['id' => $facture->id]);
        $this->delete(route('articles.destroy', $article))->assertRedirect();
        $this->assertDatabaseCount('details_factures', 0);
        $this->assertDatabaseHas('factures', ['id' => $facture->id]);
    }

    public function test_an_article_cannot_have_two_invoice_links(): void
    {
        $article = Article::create(['description' => 'Chaise']);
        $first = Facture::create(['numero_facture' => 'F-1']);
        $second = Facture::create(['numero_facture' => 'F-2']);
        $article->detailFacture()->create(['facture_id' => $first->id]);
        $this->expectException(QueryException::class);
        $article->detailFacture()->create(['facture_id' => $second->id]);
    }

    public function test_read_only_users_cannot_add_or_edit_articles(): void
    {
        $this->actingAs(User::factory()->create()->assignRole('Consultation'));
        $article = Article::create(['description' => 'Chaise']);
        $this->post(route('articles.store'), ['description' => 'Forbidden'])->assertForbidden();
        $this->put(route('articles.update', $article), ['description' => 'Forbidden'])->assertForbidden();
    }

    public function test_article_updates_without_invoice_field_preserve_the_existing_link(): void
    {
        $facture = Facture::create(['numero_facture' => 'F-1']);
        $article = Article::create(['description' => 'Chaise', 'prix_unitaire' => '10.00']);
        $article->detailFacture()->create(['facture_id' => $facture->id]);
        $this->put(route('articles.update', $article), ['description' => 'Chaise modifiee'])->assertRedirect();
        $this->assertDatabaseHas('details_factures', ['article_id' => $article->id, 'facture_id' => $facture->id]);
        $this->assertSame('10.00', $article->fresh()->prix_unitaire);
        $this->get(route('articles.show', $article))->assertInertia(fn (Assert $page) => $page
            ->component('Articles/Show')->where('article.detail_facture.facture.numero_facture', 'F-1'));
    }

    public function test_article_only_users_cannot_access_or_change_invoice_links(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['articles.view', 'articles.create', 'articles.update']);
        $this->actingAs($user);
        $facture = Facture::create(['numero_facture' => 'F-1']);
        $article = Article::create(['description' => 'Chaise']);
        $article->detailFacture()->create(['facture_id' => $facture->id]);
        $this->get(route('articles.show', $article))->assertInertia(fn (Assert $page) => $page
            ->component('Articles/Show')->missing('article.detail_facture'));
        $this->post(route('articles.store'), ['description' => 'Interdit', 'facture_id' => $facture->id])->assertForbidden();
        $this->put(route('articles.update', $article), ['description' => 'Interdit', 'facture_id' => null])->assertForbidden();
        $this->post(route('articles.store'), ['description' => 'Autorise', 'prix_unitaire' => null])->assertRedirect();
    }
}
