<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ServiceShowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));
    }

    public function test_service_page_lists_its_articles_with_filters(): void
    {
        $service = Service::create(['code' => 38, 'name' => 'NEPHROLOGIE']);
        $other = Service::create(['code' => 39, 'name' => 'PEDIATRIE']);
        Article::create(['description' => 'LIT', 'numero_inventaire' => '100', 'service_id' => $service->id, 'quantite_entree' => 3]);
        Article::create(['description' => 'TABLE', 'numero_inventaire' => '200', 'service_code_source' => '38', 'quantite_sortie' => 1]); // not linked yet
        Article::create(['description' => 'CHAISE', 'numero_inventaire' => '300', 'service_id' => $other->id]);

        $this->get(route('services.show', $service))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Services/Show')
                ->has('articles.data', 2)
                ->where('summary', ['total' => 2, 'entries' => 3, 'exits' => 1]));

        $this->get(route('services.show', ['service' => $service, 'search' => 'TABLE']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('articles.data', 1)
                ->where('articles.data.0.description', 'TABLE')
                ->where('filters.search', 'TABLE'));
    }

    public function test_service_articles_can_be_exported_to_excel(): void
    {
        $service = Service::create(['code' => 38, 'name' => 'NEPHROLOGIE']);
        Article::create(['description' => 'LIT', 'numero_inventaire' => '100', 'service_id' => $service->id, 'quantite_entree' => 3]);
        Article::create(['description' => 'TABLE', 'numero_inventaire' => '200', 'service_id' => $service->id]);
        Article::create(['description' => 'CHAISE', 'numero_inventaire' => '300']);

        $response = $this->get(route('services.export', ['service' => $service, 'search' => 'LIT']));
        $response->assertOk()->assertDownload('articles-service-38-'.now()->format('Y-m-d').'.xlsx');

        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $response->streamedContent());
        $reader = new \OpenSpout\Reader\XLSX\Reader();
        $reader->open($path);
        $rows = [];
        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $rows[] = $row->toArray();
            }
        }
        $reader->close();
        unlink($path);

        $this->assertCount(2, $rows); // header + the one article matching "LIT"
        $this->assertSame('Designation', $rows[0][2]);
        $this->assertSame('LIT', $rows[1][2]);
        $this->assertEquals(3, $rows[1][5]);
        $this->assertSame('100', (string) $rows[1][8]);
    }
}
