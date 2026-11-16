<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Service;
use App\Models\User;
use App\Support\ExcelSettings;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use OpenSpout\Reader\XLSX\Options as ReaderOptions;
use OpenSpout\Reader\XLSX\Reader;
use Tests\TestCase;

class ExcelSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create()->assignRole('Administrateur');
    }

    public function test_only_administrators_can_manage_the_excel_settings(): void
    {
        $viewer = User::factory()->create()->assignRole('Consultation');

        $this->actingAs($viewer)->get(route('admin.settings.excel'))->assertForbidden();
        $this->actingAs($viewer)->post(route('admin.settings.excel.sample'), ExcelSettings::defaults())->assertForbidden();
        $this->actingAs($this->admin)->get(route('admin.settings.excel'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Settings/Excel')->where('settings.sheet.name', 'Fiche inventaire'));
    }

    public function test_saved_settings_drive_columns_title_rows_totals_and_file_name(): void
    {
        $service = Service::create(['code' => 98, 'name' => 'MEDECINE DE TRAVAIL']);
        Article::create(['description' => 'BUREAU', 'service_id' => $service->id, 'numero_inventaire' => '20', 'quantite_entree' => 2, 'prix_unitaire' => 1000, 'date_mouvement' => '2026-01-10']);
        Article::create(['description' => 'ARMOIRE', 'service_id' => $service->id, 'numero_inventaire' => '9', 'quantite_entree' => 3, 'prix_unitaire' => 500, 'date_mouvement' => '2026-02-10']);

        $settings = ExcelSettings::defaults();
        $settings['document'] = [...$settings['document'], 'title_rows' => true, 'title' => 'Etat du parc', 'show_totals' => true, 'sort' => 'numero_inventaire', 'file_prefix' => 'parc'];
        $settings['sheet']['name'] = 'Parc';
        $settings['columns'] = collect($settings['columns'])->map(fn ($column) => [...$column, 'enabled' => in_array($column['key'], ['numero_inventaire', 'description', 'quantite_entree', 'valeur'], true)])
            ->sortBy(fn ($column) => array_search($column['key'], ['numero_inventaire', 'description', 'quantite_entree', 'valeur'], true) === false ? 99 : array_search($column['key'], ['numero_inventaire', 'description', 'quantite_entree', 'valeur'], true))
            ->values()->all();
        $settings['columns'][1]['label'] = 'Article';
        $this->actingAs($this->admin)->put(route('admin.settings.excel.update'), $settings)->assertSessionHasNoErrors();

        $response = $this->actingAs($this->admin)->get(route('articles.export', ['service_code' => 98]));
        $response->assertDownload('parc-service-98-'.now()->format('Y-m-d').'.xlsx');
        [$sheetName, $rows] = $this->read($response);

        $this->assertSame('Parc', $sheetName);
        $this->assertSame('Etat du parc', $rows[1][0], 'title block above the table');
        $this->assertStringContainsString('2 article(s)', $rows[2][0]);
        $this->assertStringContainsString('98 — MEDECINE DE TRAVAIL', $rows[3][0]);
        $this->assertSame(['N° inventaire', 'Article', 'Qte E', 'Valeur (DZD)'], $rows[5]);
        $this->assertSame(['9', 'ARMOIRE'], [(string) $rows[6][0], $rows[6][1]], '"9" sorts before "20"');
        $this->assertEquals([3, 1500], [$rows[6][2], $rows[6][3]]);
        $this->assertSame('Total', $rows[8][0]);
        $this->assertEquals([5, 3500], [$rows[8][2], $rows[8][3]]);
    }

    public function test_preview_and_sample_use_unsaved_settings(): void
    {
        Article::create(['description' => 'LIT', 'quantite_entree' => 1, 'date_mouvement' => '2025-12-31']);
        $settings = ExcelSettings::defaults();
        $settings['document']['date_format'] = 'yyyy-mm-dd';
        $settings['columns'] = collect($settings['columns'])->map(fn ($column) => [...$column, 'enabled' => in_array($column['key'], ['description', 'date'], true)])->all();

        $this->actingAs($this->admin)->post(route('admin.settings.excel.preview'), $settings)
            ->assertOk()
            ->assertJsonPath('columns.0.key', 'description')
            ->assertJsonPath('rows.0', ['LIT', '2025-12-31'])
            ->assertJsonPath('total', 1);

        [, $rows] = $this->read($this->actingAs($this->admin)->post(route('admin.settings.excel.sample'), $settings));
        $this->assertSame(['Désignation', 'Date mouvement'], $rows[0]);
        $this->assertSame(ExcelSettings::defaults(), ExcelSettings::current(), 'nothing was saved');
    }

    public function test_invalid_settings_are_rejected(): void
    {
        $settings = ExcelSettings::defaults();
        $settings['sheet']['name'] = 'Feuille: 1/2';
        $settings['document']['file_prefix'] = '../../evil';

        $this->actingAs($this->admin)->put(route('admin.settings.excel.update'), $settings)
            ->assertSessionHasErrors(['sheet.name', 'document.file_prefix']);

        $settings = ExcelSettings::defaults();
        $settings['columns'] = collect($settings['columns'])->map(fn ($column) => [...$column, 'enabled' => false])->all();
        $this->actingAs($this->admin)->put(route('admin.settings.excel.update'), $settings)->assertSessionHasErrors('columns');
    }

    public function test_reset_restores_the_defaults(): void
    {
        $settings = ExcelSettings::defaults();
        $settings['sheet']['name'] = 'Autre';
        ExcelSettings::save($settings, $this->admin->id);

        $this->actingAs($this->admin)->post(route('admin.settings.excel.reset'));

        $this->assertSame(ExcelSettings::defaults(), ExcelSettings::current());
    }

    /** @return array{0: string, 1: list<array>} */
    private function read(TestResponse $response): array
    {
        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $response->streamedContent());
        $options = new ReaderOptions();
        $options->SHOULD_PRESERVE_EMPTY_ROWS = true;
        $reader = new Reader($options);
        $reader->open($path);
        $rows = [];
        foreach ($reader->getSheetIterator() as $sheet) {
            $name = $sheet->getName();
            foreach ($sheet->getRowIterator() as $row) {
                $rows[] = $row->toArray();
            }
        }
        $reader->close();
        unlink($path);

        return [$name, $rows];
    }
}
