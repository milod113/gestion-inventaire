<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Service;
use App\Models\User;
use App\Support\PdfSettings;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PdfSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create()->assignRole('Administrateur');
    }

    public function test_only_administrators_can_see_or_change_the_settings(): void
    {
        $viewer = User::factory()->create()->assignRole('Consultation');

        $this->actingAs($viewer)->get(route('admin.settings.pdf'))->assertForbidden();
        $this->actingAs($viewer)->put(route('admin.settings.pdf.update'), PdfSettings::defaults())->assertForbidden();
        $this->actingAs($this->admin)->get(route('admin.settings.pdf'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Settings/Pdf')->where('settings.document.title', "Fiche d'inventaire"));
    }

    public function test_settings_are_saved_normalized_and_used_by_the_print(): void
    {
        $settings = PdfSettings::defaults();
        $settings['document']['title'] = 'Etat du parc';
        $settings['page']['accent'] = '#1d4ed8';
        $settings['columns'] = array_reverse($settings['columns']);
        $settings['columns'][0]['label'] = '';

        $this->actingAs($this->admin)->put(route('admin.settings.pdf.update'), $settings)->assertSessionHasNoErrors();

        $saved = PdfSettings::current();
        $this->assertSame('Etat du parc', $saved['document']['title']);
        $this->assertSame('observation', $saved['columns'][0]['key'], 'column order is kept');
        $this->assertSame('Observation', $saved['columns'][0]['label'], 'an empty label falls back to the default one');

        Article::create(['description' => 'LIT', 'numero_inventaire' => '100', 'quantite_entree' => 2]);
        $this->actingAs($this->admin)->get(route('articles.print'))
            ->assertOk()
            ->assertDownload('etat-du-parc.pdf');
    }

    public function test_invalid_values_are_rejected(): void
    {
        $settings = PdfSettings::defaults();
        $settings['page']['accent'] = 'red';
        $settings['page']['font_size'] = 40;
        $settings['columns'][] = ['key' => 'mot_de_passe', 'label' => 'x', 'enabled' => true];

        $this->actingAs($this->admin)->put(route('admin.settings.pdf.update'), $settings)
            ->assertSessionHasErrors(['page.accent', 'page.font_size', 'columns.11.key']);
    }

    public function test_preview_renders_unsaved_settings_as_a_pdf(): void
    {
        $service = Service::create(['code' => 98, 'name' => 'MEDECINE DE TRAVAIL']);
        Article::create(['description' => 'BUREAU', 'service_id' => $service->id, 'quantite_entree' => 1, 'prix_unitaire' => 15000]);
        $settings = PdfSettings::defaults();
        $settings['document']['show_totals'] = true;
        $settings['signatures']['enabled'] = true;
        foreach ($settings['columns'] as &$column) {
            $column['enabled'] = true;
        }

        $response = $this->actingAs($this->admin)->post(route('admin.settings.pdf.preview'), [...$settings, 'service_id' => $service->id]);

        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());
        $this->assertSame("Fiche d'inventaire", PdfSettings::current()['document']['title'], 'the preview does not save anything');
    }

    public function test_reset_restores_the_defaults(): void
    {
        $settings = PdfSettings::defaults();
        $settings['document']['title'] = 'Autre';
        PdfSettings::save($settings, $this->admin->id);

        $this->actingAs($this->admin)->post(route('admin.settings.pdf.reset'))->assertRedirect();

        $this->assertSame(PdfSettings::defaults(), PdfSettings::current());
    }

    public function test_a_custom_logo_can_be_uploaded_and_removed(): void
    {
        Storage::fake('local');

        $this->actingAs($this->admin)->post(route('admin.settings.pdf.logo'), ['logo' => UploadedFile::fake()->image('logo.png', 120, 120)])->assertSessionHasNoErrors();
        $this->assertTrue(PdfSettings::hasCustomLogo());
        $this->assertStringStartsWith('data:image/png;base64,', PdfSettings::logoDataUri());

        $this->actingAs($this->admin)->post(route('admin.settings.pdf.logo'), ['logo' => UploadedFile::fake()->create('virus.exe', 10)])->assertSessionHasErrors('logo');

        $this->actingAs($this->admin)->delete(route('admin.settings.pdf.logo.delete'));
        $this->assertFalse(PdfSettings::hasCustomLogo());
        $this->assertStringStartsWith('data:image/jpeg;base64,', PdfSettings::logoDataUri(), 'falls back to the CHU logo');
    }

    public function test_columns_added_later_are_appended_disabled(): void
    {
        $saved = PdfSettings::normalize(['columns' => [['key' => 'description', 'label' => 'Article', 'enabled' => true]]]);

        $this->assertSame(['key' => 'description', 'label' => 'Article', 'enabled' => true], $saved['columns'][0]);
        $this->assertCount(count(PdfSettings::COLUMNS), $saved['columns']);
        $this->assertFalse(collect($saved['columns'])->firstWhere('key', 'observation')['enabled']);
    }
}
