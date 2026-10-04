<?php

namespace App\Http\Controllers;

use App\Services\DbfFolderScanner;
use App\Services\GestionImportParser;
use App\Services\FactureImportParser;
use App\Services\FournisseurImportParser;
use App\Services\ServiceImportParser;
use App\Models\Article;
use App\Models\Facture;
use App\Models\ImportBatch;
use App\Models\Service;
use App\Models\AdvancedImportScan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdvancedImportController extends Controller
{
    public function index(Request $request, DbfFolderScanner $scanner): Response
    {
        $path = $request->string('path')->trim()->value();
        $files = [];
        $error = null;
        if ($path !== '') {
            try {
                $files = $scanner->scan($path);
                $scan = AdvancedImportScan::create(['path' => $path, 'user_id' => $request->user()?->id, 'files_count' => count($files), 'ready_count' => count(array_filter($files, fn ($file) => $file['status'] === 'pret')), 'error_count' => 0]);
                $scan->files()->createMany(array_map(fn ($file) => ['path' => $file['relative_path'], 'name' => $file['name'], 'type' => $file['type'], 'status' => $file['status'], 'file_hash' => $file['file_hash'], 'records' => $file['records'], 'fields' => $file['fields']], $files));
                $files = array_map(fn ($file) => collect($file)->except('full_path')->all(), $files);
            } catch (\RuntimeException $exception) { $error = $exception->getMessage(); }
        }
        return Inertia::render('Imports/Advanced', ['path' => $path, 'files' => $files, 'scanError' => $error, 'history' => AdvancedImportScan::query()->latest()->limit(5)->get(['id', 'path', 'files_count', 'ready_count', 'error_count', 'created_at'])]);
    }

    public function prepare(Request $request, DbfFolderScanner $scanner, GestionImportParser $gestionParser, FactureImportParser $factureParser, FournisseurImportParser $fournisseurParser, ServiceImportParser $serviceParser)
    {
        $data = $request->validate(['path' => ['required', 'string'], 'type' => ['required', 'in:gestion,facture,fournisseur,service']]);
        $path = $scanner->allowedFile($data['path']);
        abort_unless($path, 403);
        $storedPath = Storage::putFileAs('imports/'.$data['type'], new \Illuminate\Http\File($path), basename($path));
        $parsed = match ($data['type']) {
            'gestion' => $gestionParser->parse(Storage::path($storedPath)),
            'facture' => $factureParser->parse(Storage::path($storedPath)),
            'service' => $serviceParser->parse(Storage::path($storedPath)),
            default => $fournisseurParser->parse(Storage::path($storedPath)),
        };
        $itemsKey = match ($data['type']) { 'gestion' => 'articles', 'facture' => 'factures', 'service' => 'services', default => 'fournisseurs' };
        $items = $parsed[$itemsKey];
        $model = match ($data['type']) { 'gestion' => Article::class, 'facture' => Facture::class, 'service' => Service::class, default => \App\Models\Fournisseur::class };
        $existing = [];
        if ($data['type'] === 'service') {
            foreach (array_chunk(array_column($items, 'code'), 500) as $chunk) {
                foreach ($model::query()->whereIn('code', $chunk)->get(['code', 'name']) as $service) $existing[(string) $service->code] = $service->name;
            }
        } else {
            foreach (array_chunk(array_column($items, 'source_hash'), 500) as $chunk) {
                foreach ($model::query()->whereIn('source_hash', $chunk)->pluck('source_hash') as $hash) $existing[$hash] = true;
            }
        }
        $services = Service::query()->pluck('id', 'code')->all();
        $seen = []; $rows = []; $ready = 0; $duplicates = 0; $timestamp = now();
        foreach ($items as $item) {
            $hash = $item['source_hash'];
            $identity = $data['type'] === 'service' ? (string) $item['code'] : $hash;
            $isDuplicate = isset($seen[$identity]) || ($data['type'] === 'service'
                ? (($existing[$identity] ?? null) === $item['name'])
                : isset($existing[$identity]));
            $status = $isDuplicate ? 'duplicate' : 'ready';
            $seen[$identity] = true;
            if ($data['type'] === 'gestion') { $code = $item['service_code_source']; $item['service_id'] = $services[ctype_digit((string) $code) ? (int) $code : $code] ?? null; } elseif ($data['type'] === 'facture') $item['service_id'] = $services[(int) $item['service_reference']] ?? null;
            $status === 'ready' ? $ready++ : $duplicates++;
            $rows[] = ['source_row' => $item['source_row'], 'source_hash' => $hash, 'status' => $status, 'payload' => json_encode($item), 'errors' => $status === 'duplicate' ? json_encode(['Ligne identique deja presente.']) : null, 'created_at' => $timestamp, 'updated_at' => $timestamp];
        }
        $dateKey = $data['type'] === 'gestion' ? 'date_mouvement' : 'date_facture'; $dates = $data['type'] === 'service' ? [] : array_filter(array_column($items, $dateKey));
        $batch = ImportBatch::create(['type' => $data['type'], 'original_name' => basename($path), 'stored_path' => $storedPath, 'total_rows' => count($items), 'ready_rows' => $ready, 'duplicate_rows' => $duplicates, 'invalid_rows' => $parsed['invalid_rows'], 'date_from' => $dates ? min($dates) : null, 'date_to' => $dates ? max($dates) : null]);
        foreach (array_chunk($rows, 500) as $chunk) { foreach ($chunk as &$row) $row['import_batch_id'] = $batch->id; unset($row); DB::table('import_rows')->insert($chunk); }
        return redirect()->route('imports.show', $batch);
    }
}
