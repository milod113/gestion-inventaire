<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Facture;
use App\Models\Fournisseur;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DataSourceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));
    }

    public function test_records_created_in_the_app_are_marked_saisie(): void
    {
        $this->post(route('services.store'), ['code' => 9001, 'name' => 'Pharmacie']);
        $this->post(route('fournisseurs.store'), ['code' => 'F1', 'appellation' => 'ACME']);
        $this->post(route('factures.store'), ['numero_facture' => 'F-1']);
        $this->post(route('articles.store'), ['description' => 'Gants']);

        $this->assertSame('saisie', Service::where('code', 9001)->firstOrFail()->source);
        $this->assertSame('saisie', Fournisseur::firstOrFail()->source);
        $this->assertSame('saisie', Facture::firstOrFail()->source);
        $this->assertSame('saisie', Article::firstOrFail()->source);
    }

    public function test_lists_can_be_filtered_by_source(): void
    {
        Facture::create(['numero_facture' => 'OLD', 'source' => 'import']);
        Facture::create(['numero_facture' => 'NEW']);

        $this->get(route('factures.index', ['source' => 'import']))->assertInertia(fn (Assert $page) => $page
            ->has('factures.data', 1)->where('factures.data.0.numero_facture', 'OLD')->where('filters.source', 'import'));
        $this->get(route('factures.index', ['source' => 'saisie']))->assertInertia(fn (Assert $page) => $page
            ->has('factures.data', 1)->where('factures.data.0.numero_facture', 'NEW'));
        $this->get(route('factures.index'))->assertInertia(fn (Assert $page) => $page->has('factures.data', 2));
    }

    public function test_imported_invoices_are_read_only(): void
    {
        $facture = Facture::create(['numero_facture' => 'OLD', 'source' => 'import']);

        $this->get(route('factures.edit', $facture))->assertRedirect(route('factures.index'));
        $this->put(route('factures.update', $facture), ['numero_facture' => 'CHANGED'])->assertRedirect(route('factures.index'));
        $this->delete(route('factures.destroy', $facture))->assertRedirect(route('factures.index'));

        $this->assertSame('OLD', $facture->fresh()->numero_facture);
    }

    public function test_manually_entered_invoices_stay_editable(): void
    {
        $facture = Facture::create(['numero_facture' => 'NEW']);

        $this->put(route('factures.update', $facture), ['numero_facture' => 'EDITED']);

        $this->assertSame('EDITED', $facture->fresh()->numero_facture);
    }

    public function test_imported_articles_suppliers_and_services_remain_editable(): void
    {
        $article = Article::create(['description' => 'Old', 'source' => 'import']);
        $fournisseur = Fournisseur::create(['code' => 'F1', 'appellation' => 'Old', 'source' => 'import']);
        $service = Service::create(['code' => 9001, 'name' => 'Old', 'source' => 'import']);

        $this->put(route('articles.update', $article), ['description' => 'New']);
        $this->put(route('fournisseurs.update', $fournisseur), ['code' => 'F1', 'appellation' => 'New']);
        $this->put(route('services.update', $service), ['code' => 9001, 'name' => 'New']);

        $this->assertSame('New', $article->fresh()->description);
        $this->assertSame('New', $fournisseur->fresh()->appellation);
        $this->assertSame('New', $service->fresh()->name);
        $this->assertSame('import', $article->fresh()->source);
    }

    public function test_used_records_cannot_be_deleted(): void
    {
        $service = Service::create(['code' => 9001, 'name' => 'S']);
        Article::create(['description' => 'A', 'service_id' => $service->id]);
        $fournisseur = Fournisseur::create(['code' => 'F1', 'appellation' => 'ACME']);
        Facture::create(['numero_facture' => 'F-1', 'code_fournisseur' => 'F1']);

        $this->delete(route('services.destroy', $service));
        $this->delete(route('fournisseurs.destroy', $fournisseur));

        $this->assertModelExists($service);
        $this->assertModelExists($fournisseur);
    }

    public function test_unused_records_can_be_deleted(): void
    {
        $service = Service::create(['code' => 9001, 'name' => 'S']);
        $this->delete(route('services.destroy', $service));
        $this->assertModelMissing($service);
    }
}
