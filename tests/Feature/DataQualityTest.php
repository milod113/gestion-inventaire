<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Facture;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DataQualityTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'Administrateur'): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        return User::factory()->create()->syncRoles([$role]);
    }

    public function test_it_counts_each_kind_of_anomaly(): void
    {
        $service = Service::query()->firstOrFail();
        $article = ['description' => 'BUREAU', 'mouvement' => 'E', 'quantite_entree' => 1, 'service_id' => $service->id];

        Article::create([...$article, 'numero_inventaire' => '100']);
        Article::create([...$article, 'numero_inventaire' => '100']);        // duplicate
        Article::create([...$article, 'numero_inventaire' => '....']);       // missing
        Article::create([...$article, 'numero_inventaire' => 'DON']);        // no digit
        Article::create([...$article, 'numero_inventaire' => '9232 A 9233']); // valid range
        Article::create([...$article, 'numero_inventaire' => '200', 'service_id' => null, 'service_code_source' => '999']);
        Article::create([...$article, 'numero_inventaire' => '300', 'quantite_entree' => null]);
        Facture::create(['numero_facture' => '1', 'montant' => 0, 'date_facture' => null, 'code_fournisseur' => 'PR.1', 'service_id' => $service->id]);

        $this->actingAs($this->user())
            ->get(route('quality.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Quality/Index')
                ->where('checks', fn ($checks) => collect($checks)->pluck('count', 'key')->all() === [
                    'articles_sans_service' => 1,
                    'articles_sans_quantite' => 1,
                    'inventaire_doublon' => 2,
                    'inventaire_manquant' => 1,
                    'inventaire_non_numerique' => 1,
                    'factures_sans_date' => 1,
                    'factures_montant_nul' => 1,
                    'factures_sans_fournisseur' => 0,
                    'factures_sans_service' => 0,
                ])
                ->where('selected', 'articles_sans_service')
                ->where('unknownServiceCodes.0.code', '999')
                ->where('unknownServiceCodes.0.linkable', false));
    }

    public function test_relinking_attaches_orphan_articles_to_newly_created_services(): void
    {
        $article = Article::create(['description' => 'CHAISE', 'service_code_source' => '999', 'quantite_entree' => 1]);
        $user = $this->user();
        $service = Service::create(['code' => 999, 'name' => 'NOUVEAU SERVICE']);

        $this->actingAs($user)
            ->post(route('quality.relink-services'))
            ->assertRedirect(route('quality.index', ['check' => 'articles_sans_service']));

        $this->assertSame($service->id, $article->fresh()->service_id);
    }

    public function test_read_only_users_can_view_but_not_relink(): void
    {
        $user = $this->user('Consultation');

        $this->actingAs($user)->get(route('quality.index'))->assertOk();
        $this->actingAs($user)->post(route('quality.relink-services'))->assertForbidden();
    }
}
