<?php

namespace Tests\Feature;

use App\Models\Facture;
use App\Models\Fournisseur;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InvoiceSupplierTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->actingAs(User::factory()->create()->assignRole('Comptable'));
    }

    public function test_suppliers_can_be_searched_by_code_or_name_with_exact_code_first(): void
    {
        Fournisseur::create(['code' => 'PR.401', 'appellation' => 'ACME']);
        Fournisseur::create(['code' => 'PR.40', 'appellation' => 'Bureau Plus']);
        Fournisseur::create(['code' => 'ET.01', 'appellation' => 'Ste FOUATIH Freres']);

        $this->getJson(route('factures.fournisseurs.search', ['q' => 'PR.40']))->assertOk()
            ->assertJsonCount(2)->assertJsonPath('0.code', 'PR.40')->assertJsonPath('1.code', 'PR.401');
        $this->getJson(route('factures.fournisseurs.search', ['q' => 'fouatih']))->assertOk()
            ->assertJsonCount(1)->assertJsonPath('0.code', 'ET.01');
        $this->getJson(route('factures.fournisseurs.search', ['q' => '']))->assertOk()->assertJsonCount(0);
    }

    public function test_a_missing_supplier_can_be_created_quickly_and_used_on_an_invoice(): void
    {
        $this->postJson(route('factures.fournisseurs.store'), ['code' => ' PR.873 ', 'appellation' => 'Nouveau fournisseur'])
            ->assertCreated()->assertJsonPath('code', 'PR.873');
        $this->assertDatabaseHas('fournisseurs', ['code' => 'PR.873', 'appellation' => 'Nouveau fournisseur', 'source' => 'saisie']);

        $this->postJson(route('factures.fournisseurs.store'), ['code' => 'PR.873', 'appellation' => 'Doublon'])
            ->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->postJson(route('factures.fournisseurs.store'), ['code' => 'PR.999'])
            ->assertUnprocessable()->assertJsonValidationErrors('appellation');

        $this->post(route('factures.store'), ['numero_facture' => 'F-1', 'code_fournisseur' => 'PR.873'])->assertRedirect();
        $facture = Facture::where('numero_facture', 'F-1')->firstOrFail();
        $this->get(route('factures.show', $facture))->assertInertia(fn (Assert $page) => $page
            ->where('facture.fournisseur.appellation', 'Nouveau fournisseur'));
    }

    public function test_an_invoice_only_accepts_known_suppliers_but_keeps_legacy_codes(): void
    {
        $this->post(route('factures.store'), ['numero_facture' => 'F-2', 'code_fournisseur' => 'PR.000'])->assertSessionHasErrors('code_fournisseur');

        $legacy = Facture::create(['numero_facture' => 'F-3', 'code_fournisseur' => 'PR.555']);
        $this->put(route('factures.update', $legacy), ['numero_facture' => 'F-3B', 'code_fournisseur' => 'PR.555'])->assertSessionHasNoErrors();
        $this->assertSame('F-3B', $legacy->fresh()->numero_facture);
        $this->put(route('factures.update', $legacy), ['numero_facture' => 'F-3B', 'code_fournisseur' => 'PR.556'])->assertSessionHasErrors('code_fournisseur');
    }

    public function test_users_without_supplier_creation_right_cannot_create_one(): void
    {
        $this->actingAs(User::factory()->create()->assignRole('Consultation'));
        $this->postJson(route('factures.fournisseurs.store'), ['code' => 'PR.1', 'appellation' => 'X'])->assertForbidden();
        $this->getJson(route('factures.fournisseurs.search', ['q' => 'PR']))->assertOk();
    }
}
