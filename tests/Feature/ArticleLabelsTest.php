<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleLabelsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->actingAs(User::factory()->create()->assignRole('Administrateur'));
    }

    public function test_labels_pdf_is_generated_for_selected_articles(): void
    {
        $article = Article::create(['description' => 'Ecran Dell', 'numero_inventaire' => 'INV-2024/157']);

        foreach (['a4', 'thermique'] as $format) {
            $this->get(route('articles.labels', ['ids' => [$article->id], 'format' => $format, 'copies' => 2]))
                ->assertOk()
                ->assertHeader('content-type', 'application/pdf');
        }
    }

    public function test_articles_without_inventory_number_are_rejected(): void
    {
        $article = Article::create(['description' => 'Sans numero']);

        $this->from(route('articles.index'))
            ->get(route('articles.labels', ['ids' => [$article->id]]))
            ->assertRedirect(route('articles.index'))
            ->assertSessionHas('error');
    }

    public function test_invalid_format_is_rejected(): void
    {
        $this->get(route('articles.labels', ['format' => 'unknown']))->assertSessionHasErrors('format');
    }
}
