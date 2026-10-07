<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Facture;
use App\Models\Fournisseur;
use App\Models\ImportBatch;
use App\Models\ImportRow;
use App\Models\Service;
use App\Services\GestionImportParser;
use App\Services\FactureImportParser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ImportController extends Controller
{
    public function index(): Response
    {
        $search = request()->string('search')->trim()->value();
        $type = request()->string('type')->trim()->value();
        $query = ImportBatch::query()->whereIn('type', ['gestion', 'facture', 'fournisseur', 'service'])
            ->when($search, fn ($query) => $query->where('original_name', 'like', "%{$search}%"))
            ->when(in_array($type, ['gestion', 'facture', 'fournisseur', 'service'], true), fn ($query) => $query->where('type', $type));
        return Inertia::render('Imports/Index', [
            'batches' => (clone $query)->latest()->paginate(50)->withQueryString(),
            'filters' => ['search' => $search, 'type' => $type],
            'summary' => [
                'analysed' => (clone $query)->count(),
                'imported' => (clone $query)->where('status', 'imported')->count(),
                'pending' => (clone $query)->where('status', 'previewed')->count(),
                'ready' => (int) (clone $query)->where('status', 'previewed')->sum('ready_rows'),
                'duplicates' => (int) (clone $query)->sum('duplicate_rows'),
            ],
        ]);
    }

    public function preview(Request $request, GestionImportParser $parser): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'extensions:xlsx,dbf', 'max:51200'],
        ]);

        $file = $request->file('file');
        $storedPath = $file->store('imports/gestion');
        $parsed = $parser->parse(Storage::path($storedPath));
        $articles = $parsed['articles'];
        $serviceIdsByCode = Service::query()->pluck('id', 'code')->all();
        $existingHashes = $this->existingHashes(array_column($articles, 'source_hash'));
        $existingInventories = $this->existingInventories(array_column($articles, 'numero_inventaire'));
        $seenHashes = [];
        $rows = [];
        $summary = ['ready' => 0, 'duplicate' => 0, 'conflict' => 0];
        $dates = array_filter(array_column($articles, 'date_mouvement'));
        $timestamp = now();

        foreach ($articles as $article) {
            $hash = $article['source_hash'];
            $inventory = $article['numero_inventaire'];
            $serviceCode = $article['service_code_source'];
            $serviceKey = ctype_digit((string) $serviceCode) ? (int) $serviceCode : $serviceCode;
            $status = 'ready';
            $errors = [];

            if (isset($seenHashes[$hash]) || isset($existingHashes[$hash])) {
                $status = 'duplicate';
                $errors[] = 'Ligne identique deja presente.';
            } elseif ($inventory && isset($existingInventories[$inventory])) {
                $status = 'conflict';
                $errors[] = 'Numero inventaire deja utilise avec des donnees differentes.';
            }

            $seenHashes[$hash] = true;
            $summary[$status]++;
            $article['service_id'] = $serviceIdsByCode[$serviceKey] ?? null;

            $rows[] = [
                'source_row' => $article['source_row'],
                'source_hash' => $hash,
                'status' => $status,
                'payload' => json_encode($article),
                'errors' => $errors === [] ? null : json_encode($errors),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];
        }

        $batch = ImportBatch::create([
            'type' => 'gestion',
            'original_name' => $file->getClientOriginalName(),
            'stored_path' => $storedPath,
            'total_rows' => count($articles),
            'ready_rows' => $summary['ready'],
            'duplicate_rows' => $summary['duplicate'],
            'conflict_rows' => $summary['conflict'],
            'invalid_rows' => $parsed['invalid_rows'],
            'date_from' => $dates === [] ? null : min($dates),
            'date_to' => $dates === [] ? null : max($dates),
        ]);

        foreach (array_chunk($rows, 500) as $chunk) {
            foreach ($chunk as &$row) {
                $row['import_batch_id'] = $batch->id;
            }
            unset($row);

            DB::table('import_rows')->insert($chunk);
        }

        return redirect()->route('imports.show', $batch);
    }

    public function show(ImportBatch $batch): Response
    {
        abort_unless(in_array($batch->type, ['gestion', 'facture', 'fournisseur', 'service'], true), 404);

        return Inertia::render('Imports/Show', [
            'batch' => $batch,
            'examples' => $batch->rows()
                ->whereIn('status', ['conflict', 'duplicate'])
                ->latest('id')
                ->limit(10)
                ->get(['source_row', 'status', 'payload', 'errors']),
            'preview' => $batch->rows()
                ->where('status', 'ready')
                ->orderBy('source_row')
                ->limit(8)
                ->get(['source_row', 'payload']),
        ]);
    }

    public function commit(ImportBatch $batch): RedirectResponse
    {
        abort_unless($batch->status === 'previewed', 404);

        if ($batch->type === 'facture') {
            return $this->commitFactures($batch);
        }
        if ($batch->type === 'fournisseur') {
            $items = $batch->rows()->where('status', 'ready')->get()->map(function (ImportRow $row) use ($batch) {
                $item = $row->payload;
                unset($item['source_row']);

                return [...$item, 'import_batch_id' => $batch->id, 'source' => 'import', 'created_at' => now(), 'updated_at' => now()];
            })->all();
            Fournisseur::upsert($items, ['source_hash'], ['code', 'appellation', 'adresse', 'rc_autres', 'cb_autres', 'telephone', 'telex', 'artv', 'observation', 'import_batch_id', 'updated_at']);
            $batch->update(['status' => 'imported', 'imported_rows' => count($items)]);
            return redirect()->route('imports.show', $batch)->with('success', count($items).' nouveaux fournisseurs ont ete importes.');
        }

        if ($batch->type === 'service') {
            $items = $batch->rows()->where('status', 'ready')->get()->map(function (ImportRow $row) use ($batch) {
                $item = $row->payload;
                unset($item['source_row'], $item['source_hash']);

                return [...$item, 'source' => 'import', 'created_at' => now(), 'updated_at' => now()];
            })->all();

            if ($items !== []) {
                Service::upsert($items, ['code'], ['name', 'updated_at']);
            }
            $batch->update(['status' => 'imported', 'imported_rows' => count($items)]);

            return redirect()->route('imports.show', $batch)->with('success', count($items).' services ont ete importes ou mis a jour.');
        }

        abort_unless($batch->type === 'gestion', 404);

        $serviceIdsByCode = Service::query()->pluck('id', 'code')->all();
        $imported = 0;

        $batch->rows()->where('status', 'ready')->orderBy('id')->chunkById(500, function ($rows) use ($batch, $serviceIdsByCode, &$imported) {
            $articles = $rows->map(function (ImportRow $row) use ($batch, $serviceIdsByCode) {
                $article = $row->payload;
                $serviceCode = $article['service_code_source'];
                $serviceKey = ctype_digit((string) $serviceCode) ? (int) $serviceCode : $serviceCode;

                return [
                    ...$article,
                    'service_id' => $serviceIdsByCode[$serviceKey] ?? null,
                    'import_batch_id' => $batch->id,
                    'source' => 'import',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->all();

            Article::upsert(
                $articles,
                ['source_hash'],
                ['service_id', 'service_code_source', 'description', 'mouvement', 'date_mouvement', 'date_source', 'quantite_entree', 'quantite_sortie', 'numero_bon', 'observation', 'numero_inventaire', 'source_row', 'import_batch_id', 'updated_at'],
            );
            $imported += count($articles);
        });

        $batch->update(['status' => 'imported', 'imported_rows' => $imported]);

        return redirect()->route('imports.show', $batch)->with('success', $imported.' nouvelles lignes ont ete importees.');
    }

    public function report(ImportBatch $batch)
    {
        return response()->streamDownload(function () use ($batch) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Lot', $batch->original_name]);
            fputcsv($out, ['Type', $batch->type]);
            fputcsv($out, ['Lignes lues', $batch->total_rows]);
            fputcsv($out, ['Importees', $batch->imported_rows]);
            fputcsv($out, ['Doublons', $batch->duplicate_rows]);
            fputcsv($out, []);
            fputcsv($out, ['Ligne source', 'Etat', 'Reference', 'Motif']);
            $batch->rows()->orderBy('source_row')->each(function (ImportRow $row) use ($out, $batch) {
                $payload = $row->payload ?? [];
                $reference = $payload['description'] ?? $payload['numero_facture'] ?? $payload['appellation'] ?? $payload['code'] ?? '';
                fputcsv($out, [$row->source_row, $row->status, $reference, implode(' ', $row->errors ?? [])]);
            });
            fclose($out);
        }, 'rapport-import-'.$batch->id.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function previewFactures(Request $request, FactureImportParser $parser): RedirectResponse
    {
        $request->validate(['file' => ['required', 'file', 'extensions:dbf', 'max:51200']]);
        $file = $request->file('file');
        $storedPath = $file->store('imports/facture');
        $parsed = $parser->parse(Storage::path($storedPath));
        $factures = $parsed['factures'];
        $serviceIds = Service::query()->pluck('id', 'code')->all();
        $existing = [];
        foreach (array_chunk(array_column($factures, 'source_hash'), 500) as $chunk) {
            foreach (Facture::query()->whereIn('source_hash', $chunk)->pluck('source_hash') as $hash) $existing[$hash] = true;
        }
        $seen = [];
        $summary = ['ready' => 0, 'duplicate' => 0, 'conflict' => 0];
        $rows = [];
        $dates = array_filter(array_column($factures, 'date_facture'));
        $timestamp = now();

        foreach ($factures as $facture) {
            $hash = $facture['source_hash'];
            $status = isset($seen[$hash]) || isset($existing[$hash]) ? 'duplicate' : 'ready';
            $facture['service_id'] = $serviceIds[(int) $facture['service_reference']] ?? null;
            $seen[$hash] = true;
            $summary[$status]++;
            $rows[] = ['source_row' => $facture['source_row'], 'source_hash' => $hash, 'status' => $status, 'payload' => json_encode($facture), 'errors' => $status === 'duplicate' ? json_encode(['Facture identique deja presente.']) : null, 'created_at' => $timestamp, 'updated_at' => $timestamp];
        }

        $batch = ImportBatch::create(['type' => 'facture', 'original_name' => $file->getClientOriginalName(), 'stored_path' => $storedPath, 'total_rows' => count($factures), 'ready_rows' => $summary['ready'], 'duplicate_rows' => $summary['duplicate'], 'conflict_rows' => 0, 'invalid_rows' => $parsed['invalid_rows'], 'date_from' => $dates === [] ? null : min($dates), 'date_to' => $dates === [] ? null : max($dates)]);
        foreach (array_chunk($rows, 500) as $chunk) {
            foreach ($chunk as &$row) $row['import_batch_id'] = $batch->id;
            unset($row);
            DB::table('import_rows')->insert($chunk);
        }

        return redirect()->route('imports.show', $batch);
    }

    private function commitFactures(ImportBatch $batch): RedirectResponse
    {
        $serviceIds = Service::query()->pluck('id', 'code')->all();
        $imported = 0;
        $batch->rows()->where('status', 'ready')->orderBy('id')->chunkById(500, function ($rows) use ($batch, $serviceIds, &$imported) {
            $factures = $rows->map(function (ImportRow $row) use ($batch, $serviceIds) {
                $facture = $row->payload;
                $facture['service_id'] = $serviceIds[(int) $facture['service_reference']] ?? null;
                $facture['import_batch_id'] = $batch->id;
                $facture['source'] = 'import';
                $facture['created_at'] = now();
                $facture['updated_at'] = now();
                return $facture;
            })->all();
            Facture::upsert($factures, ['source_hash'], ['service_id', 'n_bon', 'service_reference', 'service_reference_normalisee', 'imputation', 'n_journal', 'numero_facture', 'date_facture', 'date_facture_source', 'montant', 'code_fournisseur', 'n_inventaire', 'cfac', 'n_mandat', 'date_mandat', 'date_mandat_source', 'source_row', 'import_batch_id', 'updated_at']);
            $imported += count($factures);
        });
        $batch->update(['status' => 'imported', 'imported_rows' => $imported]);
        return redirect()->route('imports.show', $batch)->with('success', $imported.' nouvelles factures ont ete importees.');
    }

    private function existingHashes(array $hashes): array
    {
        $existing = [];

        foreach (array_chunk($hashes, 500) as $chunk) {
            foreach (Article::query()->whereIn('source_hash', $chunk)->pluck('source_hash') as $hash) {
                $existing[$hash] = true;
            }
        }

        return $existing;
    }

    private function existingInventories(array $inventories): array
    {
        $existing = [];
        $inventories = array_values(array_unique(array_filter($inventories)));

        foreach (array_chunk($inventories, 500) as $chunk) {
            foreach (Article::query()->whereIn('numero_inventaire', $chunk)->pluck('numero_inventaire') as $inventory) {
                $existing[$inventory] = true;
            }
        }

        return $existing;
    }
}
