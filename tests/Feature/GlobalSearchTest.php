<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Facture;
use App\Models\Fournisseur;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Article::create(['description' => 'TABLEAU BLANC', 'numero_inventaire' => '35632', 'mouvement' => 'E']);
        Article::create(['description' => 'BUREAU', 'numero_inventaire' => '356320']);
        Facture::create(['numero_facture' => '015', 'code_fournisseur' => 'PR.401', 'montant' => 1250.5]);
        Fournisseur::create(['code' => 'PR.401', 'appellation' => 'Ste FOUATIH Freres']);
    }

    public function test_it_finds_articles_invoices_and_suppliers_with_exact_codes_first(): void
    {
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));

        $this->getJson(route('search', ['q' => '35632']))->assertOk()
            ->assertJsonCount(2, 'articles')
            ->assertJsonPath('articles.0.title', 'TABLEAU BLANC')
            ->assertJsonPath('articles.0.subtitle', 'Inv. 35632 · Entree');

        $this->getJson(route('search', ['q' => 'PR.401']))->assertOk()
            ->assertJsonPath('factures.0.title', 'Facture 015')
            ->assertJsonPath('factures.0.subtitle', 'PR.401 · 1 250,50 DA')
            ->assertJsonPath('fournisseurs.0.title', 'Ste FOUATIH Freres')
            ->assertJsonMissingPath('articles');

        $this->getJson(route('search', ['q' => 'fouatih']))->assertOk()
            ->assertJsonPath('fournisseurs.0.url', route('fournisseurs.show', Fournisseur::firstOrFail()));
    }

    public function test_short_terms_return_nothing_and_wildcards_are_literal(): void
    {
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));

        $this->getJson(route('search', ['q' => 'B']))->assertOk()->assertExactJson([]);
        $this->getJson(route('search', ['q' => '%%']))->assertOk()->assertExactJson([]);
    }

    public function test_results_are_limited_to_sections_the_user_can_view(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('articles.view');
        $this->actingAs($user);

        $this->getJson(route('search', ['q' => 'PR.401']))->assertOk()->assertExactJson([]);
        $this->getJson(route('search', ['q' => 'tableau']))->assertOk()->assertJsonCount(1, 'articles');
    }

    public function test_guests_cannot_search(): void
    {
        $this->getJson(route('search', ['q' => 'tableau']))->assertUnauthorized();
    }
}
