<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use OpenSpout\Reader\XLSX\Reader;
use Tests\TestCase;

class ArticlesExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));
    }

    public function test_export_follows_the_list_filters_and_matches_the_pdf_columns(): void
    {
        $service = Service::create(['code' => 98, 'name' => 'RADIOLOGIE']);
        Article::create(['description' => 'ECHOGRAPHE', 'service_id' => $service->id, 'numero_inventaire' => '1001', 'quantite_entree' => 2, 'date_mouvement' => '2026-03-15', 'numero_bon' => 'B-7', 'observation' => 'Neuf']);
        Article::create(['description' => 'TABLE', 'service_code_source' => '098', 'quantite_sortie' => 1]); // not linked yet
        Article::create(['description' => 'CHAISE', 'service_code_source' => '12']);

        $response = $this->get(route('articles.export', ['service_code' => 98]));
        $response->assertOk()->assertDownload('fiche-inventaire-service-98-'.now()->format('Y-m-d').'.xlsx');
        $rows = $this->rows($response);

        $this->assertSame(['Code service', 'Service', 'Désignation', 'Date mouvement', 'Qte E', 'Qte S', 'N° bon', 'N° inventaire', 'Observation'], $rows[0]);
        $this->assertCount(2, $rows); // header + ECHOGRAPHE ("098" is not "98" for the list filter either)
        [, $name, $description, $date, $in, , $bon, $inventory, $observation] = $rows[1];
        $this->assertSame(['RADIOLOGIE', 'ECHOGRAPHE', '2026-03-15', 'B-7', '1001', 'Neuf'], [$name, $description, $date->format('Y-m-d'), $bon, (string) $inventory, $observation]);
        $this->assertEquals(2, $in);
    }

    public function test_unlinked_articles_show_their_service_and_search_is_applied(): void
    {
        Service::create(['code' => 12, 'name' => 'PEDIATRIE']);
        Article::create(['description' => 'BERCEAU', 'service_code_source' => '12']);
        Article::create(['description' => 'CHAISE', 'service_code_source' => '12']);

        $rows = $this->rows($this->get(route('articles.export', ['search' => 'BERCEAU'])));

        $this->assertCount(2, $rows);
        $this->assertSame(['12', 'PEDIATRIE', 'BERCEAU'], [(string) $rows[1][0], $rows[1][1], $rows[1][2]]);
    }

    public function test_every_article_is_exported_beyond_one_chunk(): void
    {
        $now = now();
        $rows = collect(range(1, 1300))->map(fn (int $i) => [
            'description' => "ARTICLE {$i}", 'date_mouvement' => $now->copy()->subDays($i % 97)->toDateString(),
            'source' => 'saisie', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $rows->chunk(500)->each(fn ($chunk) => Article::insert($chunk->all()));

        $exported = $this->rows($this->get(route('articles.export')));

        $this->assertCount(1301, $exported);
        $this->assertCount(1300, collect($exported)->skip(1)->pluck(2)->unique());
    }

    private function rows(TestResponse $response): array
    {
        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $response->streamedContent());
        $reader = new Reader();
        $reader->open($path);
        $rows = [];
        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $rows[] = $row->toArray();
            }
        }
        $reader->close();
        unlink($path);

        return $rows;
    }
}
