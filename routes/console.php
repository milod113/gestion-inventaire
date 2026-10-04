<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use App\Models\Article;
use App\Services\ArticleSourceHasher;
use Symfony\Component\Process\Process;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('database:backup {--path=}', function () {
    $connection = config('database.connections.'.config('database.default'));
    $dumpPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';

    if (($connection['driver'] ?? null) !== 'mysql' || ! is_file($dumpPath)) {
        $this->error('MySQL ou mysqldump est introuvable.');

        return 1;
    }

    $directory = $this->option('path') ?: storage_path('app/backups');
    if (! is_dir($directory)) mkdir($directory, 0755, true);
    $file = rtrim($directory, '\\/').DIRECTORY_SEPARATOR.'gestion-inventaire-'.now()->format('Y-m-d-His').'.sql';
    $command = [$dumpPath, '--host='.$connection['host'], '--port='.(string) $connection['port'], '--user='.$connection['username'], '--single-transaction', '--routines', '--events', '--default-character-set=utf8mb4', '--result-file='.$file];
    if (($connection['password'] ?? '') !== '') $command[] = '--password='.$connection['password'];
    $command[] = $connection['database'];
    $process = new Process($command);
    $process->setTimeout(120);
    $process->run();

    if (! $process->isSuccessful() || ! is_file($file)) {
        $this->error('La sauvegarde a echoue.');

        return 1;
    }

    $this->info('Sauvegarde creee : '.$file);
})->purpose('Create a MySQL database backup');

Artisan::command('services:import {path?}', function (?string $path = null) {
    $path ??= base_path('data-inventaire/CODES.xlsx');

    if (! is_file($path)) {
        $this->error("Fichier introuvable : {$path}");

        return 1;
    }

    $archive = new ZipArchive();

    if ($archive->open($path) !== true) {
        $this->error("Impossible d'ouvrir le fichier Excel : {$path}");

        return 1;
    }

    $sharedStringsXml = $archive->getFromName('xl/sharedStrings.xml');
    $worksheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');
    $archive->close();

    if ($sharedStringsXml === false || $worksheetXml === false) {
        $this->error('Le fichier Excel ne contient pas la feuille ou les donnees attendues.');

        return 1;
    }

    $sharedStringsDocument = new DOMDocument();
    $worksheetDocument = new DOMDocument();

    if (! $sharedStringsDocument->loadXML($sharedStringsXml) || ! $worksheetDocument->loadXML($worksheetXml)) {
        $this->error('Le contenu du fichier Excel est invalide.');

        return 1;
    }

    $sharedStrings = [];

    foreach ($sharedStringsDocument->getElementsByTagName('si') as $string) {
        $sharedStrings[] = trim($string->textContent);
    }

    $services = [];

    foreach ($worksheetDocument->getElementsByTagName('row') as $row) {
        $cells = [];

        foreach ($row->getElementsByTagName('c') as $cell) {
            $column = preg_replace('/\d+/', '', $cell->getAttribute('r'));
            $value = $cell->getElementsByTagName('v')->item(0)?->textContent ?? '';
            $cells[$column] = $cell->getAttribute('t') === 's'
                ? ($sharedStrings[(int) $value] ?? '')
                : $value;
        }

        if (! isset($cells['A'], $cells['B']) || $cells['A'] === 'CODE') {
            continue;
        }

        $code = trim($cells['A']);
        $name = trim($cells['B']);

        if (! ctype_digit($code) || $name === '') {
            continue;
        }

        $services[] = [
            'code' => (int) $code,
            'name' => $name,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    if ($services === []) {
        $this->error('Aucun service valide n a ete trouve dans le fichier Excel.');

        return 1;
    }

    DB::table('services')->upsert(
        $services,
        ['code'],
        ['name', 'updated_at'],
    );

    $this->info(count($services).' services importes ou mis a jour.');
})->purpose('Import services from an Excel CODE/SERVICE file');

Artisan::command('factures:import {path?}', function (?string $path = null) {
    $path ??= base_path('data-inventaire/FACTURE11.xlsx');

    if (! is_file($path)) {
        $this->error("Fichier introuvable : {$path}");

        return 1;
    }

    $archive = new ZipArchive();

    if ($archive->open($path) !== true) {
        $this->error("Impossible d'ouvrir le fichier Excel : {$path}");

        return 1;
    }

    $sharedStringsXml = $archive->getFromName('xl/sharedStrings.xml');
    $worksheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');
    $archive->close();

    if ($sharedStringsXml === false || $worksheetXml === false) {
        $this->error('Le fichier Excel ne contient pas la feuille ou les donnees attendues.');

        return 1;
    }

    $sharedStringsDocument = new DOMDocument();
    $worksheetDocument = new DOMDocument();

    if (! $sharedStringsDocument->loadXML($sharedStringsXml) || ! $worksheetDocument->loadXML($worksheetXml)) {
        $this->error('Le contenu du fichier Excel est invalide.');

        return 1;
    }

    $sharedStrings = [];

    foreach ($sharedStringsDocument->getElementsByTagName('si') as $string) {
        $sharedStrings[] = trim($string->textContent);
    }

    $normaliseService = fn (string $value) => preg_replace('/[^A-Z0-9]+/', '', strtoupper(trim($value)));
    $serviceIdsByCode = [];
    $serviceIdsByName = [];

    foreach (DB::table('services')->get(['id', 'code', 'name']) as $service) {
        $serviceIdsByCode[(string) $service->code] = $service->id;
        $serviceIdsByName[$normaliseService($service->name)] = $service->id;
    }

    $normaliseDate = function (string $value): ?string {
        $value = trim($value);

        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $matches)) {
            [, $year, $month, $day] = $matches;
        } elseif (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $value, $matches)) {
            [, $day, $month, $year] = $matches;
        } else {
            return null;
        }

        $year = (int) $year;

        // DBF dates were exported with 19xx instead of their intended 20xx year.
        if ($year >= 1900 && $year <= 1925) {
            $year += 100;
        }

        return checkdate((int) $month, (int) $day, $year)
            ? sprintf('%04d-%02d-%02d', $year, $month, $day)
            : null;
    };

    $factures = [];
    $unlinkedServices = 0;
    $timestamp = now();

    foreach ($worksheetDocument->getElementsByTagName('row') as $row) {
        $cells = [];

        foreach ($row->getElementsByTagName('c') as $cell) {
            $column = preg_replace('/\d+/', '', $cell->getAttribute('r'));
            $value = $cell->getElementsByTagName('v')->item(0)?->textContent ?? '';
            $cells[$column] = $cell->getAttribute('t') === 's'
                ? ($sharedStrings[(int) $value] ?? '')
                : trim($value);
        }

        if (($cells['A'] ?? null) === 'N_BON' || $cells === []) {
            continue;
        }

        $serviceReference = trim($cells['B'] ?? '');
        $serviceId = $serviceIdsByCode[(string) ((int) $serviceReference)]
            ?? $serviceIdsByName[$normaliseService($serviceReference)]
            ?? null;

        if ($serviceReference !== '' && $serviceId === null) {
            $unlinkedServices++;
        }

        $dateFactureSource = trim($cells['F'] ?? '');
        $dateMandatSource = trim($cells['L'] ?? '');
        $montant = str_replace(',', '.', preg_replace('/\s+/', '', trim($cells['G'] ?? '')));

        $factures[] = [
            'source_row' => (int) $row->getAttribute('r'),
            'service_id' => $serviceId,
            'n_bon' => trim($cells['A'] ?? '') ?: null,
            'service_reference' => $serviceReference ?: null,
            'imputation' => trim($cells['C'] ?? '') ?: null,
            'n_journal' => trim($cells['D'] ?? '') ?: null,
            'numero_facture' => trim($cells['E'] ?? '') ?: null,
            'date_facture' => $normaliseDate($dateFactureSource),
            'date_facture_source' => $dateFactureSource ?: null,
            'montant' => is_numeric($montant) ? $montant : null,
            'code_fournisseur' => trim($cells['H'] ?? '') ?: null,
            'n_inventaire' => trim($cells['I'] ?? '') ?: null,
            'cfac' => trim($cells['J'] ?? '') ?: null,
            'n_mandat' => trim($cells['K'] ?? '') ?: null,
            'date_mandat' => $normaliseDate($dateMandatSource),
            'date_mandat_source' => $dateMandatSource ?: null,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ];
    }

    if ($factures === []) {
        $this->error('Aucune facture valide n a ete trouvee dans le fichier Excel.');

        return 1;
    }

    DB::table('factures')->upsert(
        $factures,
        ['source_row'],
        ['service_id', 'n_bon', 'service_reference', 'imputation', 'n_journal', 'numero_facture', 'date_facture', 'date_facture_source', 'montant', 'code_fournisseur', 'n_inventaire', 'cfac', 'n_mandat', 'date_mandat', 'date_mandat_source', 'updated_at'],
    );

    $this->info(count($factures).' factures importees ou mises a jour.');
    $this->warn($unlinkedServices.' references de service n ont pas ete associees automatiquement.');
})->purpose('Import invoices from an Excel file and correct legacy DBF dates');

Artisan::command('fournisseurs:import {path?}', function (?string $path = null) {
    $path ??= base_path('data-inventaire/FOURNIS.xlsx');

    if (! is_file($path)) {
        $this->error("Fichier introuvable : {$path}");

        return 1;
    }

    $archive = new ZipArchive();

    if ($archive->open($path) !== true) {
        $this->error("Impossible d'ouvrir le fichier Excel : {$path}");

        return 1;
    }

    $sharedStringsXml = $archive->getFromName('xl/sharedStrings.xml');
    $worksheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');
    $archive->close();

    if ($sharedStringsXml === false || $worksheetXml === false) {
        $this->error('Le fichier Excel ne contient pas la feuille ou les donnees attendues.');

        return 1;
    }

    $sharedStringsDocument = new DOMDocument();
    $worksheetDocument = new DOMDocument();

    if (! $sharedStringsDocument->loadXML($sharedStringsXml) || ! $worksheetDocument->loadXML($worksheetXml)) {
        $this->error('Le contenu du fichier Excel est invalide.');
        return 1;
    }

    $sharedStrings = [];

    foreach ($sharedStringsDocument->getElementsByTagName('si') as $string) {
        $sharedStrings[] = trim($string->textContent);
    }

    $fournisseursByCode = [];
    $readRows = 0;
    $timestamp = now();

    foreach ($worksheetDocument->getElementsByTagName('row') as $row) {
        $cells = [];

        foreach ($row->getElementsByTagName('c') as $cell) {
            $column = preg_replace('/\d+/', '', $cell->getAttribute('r'));
            $value = $cell->getElementsByTagName('v')->item(0)?->textContent ?? '';
            $cells[$column] = $cell->getAttribute('t') === 's'
                ? ($sharedStrings[(int) $value] ?? '')
                : trim($value);
        }

        if (($cells['A'] ?? null) === 'APPELATION' || $cells === []) {
            continue;
        }

        $code = trim($cells['I'] ?? '');
        $appellation = trim($cells['A'] ?? '');

        if ($code === '' || $appellation === '') {
            continue;
        }

        $readRows++;
        // A supplier code is unique; the last row in the source file is retained.
        $fournisseursByCode[$code] = [
            'code' => $code,
            'appellation' => $appellation,
            'adresse' => trim($cells['B'] ?? '') ?: null,
            'rc_autres' => trim($cells['C'] ?? '') ?: null,
            'cb_autres' => trim($cells['D'] ?? '') ?: null,
            'telephone' => trim($cells['E'] ?? '') ?: null,
            'telex' => trim($cells['F'] ?? '') ?: null,
            'artv' => trim($cells['G'] ?? '') ?: null,
            'observation' => trim($cells['H'] ?? '') ?: null,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ];
    }

    $fournisseurs = array_values($fournisseursByCode);

    if ($fournisseurs === []) {
        $this->error('Aucun fournisseur valide n a ete trouve dans le fichier Excel.');

        return 1;
    }

    DB::table('fournisseurs')->upsert(
        $fournisseurs,
        ['code'],
        ['appellation', 'adresse', 'rc_autres', 'cb_autres', 'telephone', 'telex', 'artv', 'observation', 'updated_at'],
    );

    $duplicates = $readRows - count($fournisseurs);
    $this->info(count($fournisseurs).' fournisseurs importes ou mis a jour.');

    if ($duplicates > 0) {
        $this->warn($duplicates.' lignes partageaient un code fournisseur : la derniere occurrence a ete retenue.');
    }
})->purpose('Import suppliers from an Excel APPELATION/CODE_FORN file');

Artisan::command('articles:import {path?}', function (?string $path = null) {
    $path ??= base_path('data-inventaire/GESTION.xlsx');

    if (! is_file($path)) {
        $this->error("Fichier introuvable : {$path}");

        return 1;
    }

    $archive = new ZipArchive();

    if ($archive->open($path) !== true) {
        $this->error("Impossible d'ouvrir le fichier Excel : {$path}");

        return 1;
    }

    $sharedStringsXml = $archive->getFromName('xl/sharedStrings.xml');
    $worksheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');
    $archive->close();

    if ($sharedStringsXml === false || $worksheetXml === false) {
        $this->error('Le fichier Excel ne contient pas la feuille ou les donnees attendues.');

        return 1;
    }

    $sharedStringsDocument = new DOMDocument();
    $worksheetDocument = new DOMDocument();

    if (! $sharedStringsDocument->loadXML($sharedStringsXml) || ! $worksheetDocument->loadXML($worksheetXml)) {
        $this->error('Le contenu du fichier Excel est invalide.');

        return 1;
    }

    $sharedStrings = [];

    foreach ($sharedStringsDocument->getElementsByTagName('si') as $string) {
        $sharedStrings[] = trim($string->textContent);
    }

    $serviceIdsByCode = [];

    foreach (DB::table('services')->get(['id', 'code']) as $service) {
        $serviceIdsByCode[(string) $service->code] = $service->id;
    }

    $normaliseDate = function (string $value): ?string {
        $value = trim($value);

        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $matches)) {
            [, $year, $month, $day] = $matches;
        } elseif (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $value, $matches)) {
            [, $day, $month, $year] = $matches;
        } else {
            return null;
        }

        $year = (int) $year;

        // DBF exports recorded intended 20xx dates as 19xx values.
        if ($year >= 1900 && $year <= 1925) {
            $year += 100;
        }

        return checkdate((int) $month, (int) $day, $year)
            ? sprintf('%04d-%02d-%02d', $year, $month, $day)
            : null;
    };

    $normaliseNumber = function (string $value): ?string {
        $value = str_replace(',', '.', preg_replace('/\s+/', '', trim($value)));

        return is_numeric($value) ? $value : null;
    };

    $articles = [];
    $skippedRows = 0;
    $unlinkedServices = 0;
    $timestamp = now();

    foreach ($worksheetDocument->getElementsByTagName('row') as $row) {
        $cells = [];

        foreach ($row->getElementsByTagName('c') as $cell) {
            $column = preg_replace('/\d+/', '', $cell->getAttribute('r'));
            $value = $cell->getElementsByTagName('v')->item(0)?->textContent ?? '';
            $cells[$column] = $cell->getAttribute('t') === 's'
                ? ($sharedStrings[(int) $value] ?? '')
                : trim($value);
        }

        if (($cells['B'] ?? null) === 'DES' || $cells === []) {
            continue;
        }

        $description = trim($cells['B'] ?? '');

        if ($description === '') {
            $skippedRows++;

            continue;
        }

        $serviceCode = trim($cells['A'] ?? '');
        $serviceKey = ctype_digit($serviceCode) ? (string) ((int) $serviceCode) : $serviceCode;
        $serviceId = $serviceIdsByCode[$serviceKey] ?? null;

        if ($serviceCode !== '' && $serviceId === null) {
            $unlinkedServices++;
        }

        $dateSource = trim($cells['D'] ?? '');
        $articles[] = [
            'source_row' => (int) $row->getAttribute('r'),
            'service_id' => $serviceId,
            'service_code_source' => $serviceCode ?: null,
            'description' => $description,
            'mouvement' => trim($cells['C'] ?? '') ?: null,
            'date_mouvement' => $normaliseDate($dateSource),
            'date_source' => $dateSource ?: null,
            'quantite_entree' => $normaliseNumber($cells['E'] ?? ''),
            'quantite_sortie' => $normaliseNumber($cells['F'] ?? ''),
            'numero_bon' => trim($cells['G'] ?? '') ?: null,
            'observation' => trim($cells['H'] ?? '') ?: null,
            'numero_inventaire' => trim($cells['I'] ?? '') ?: null,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ];
    }

    if ($articles === []) {
        $this->error('Aucun article valide n a ete trouve dans le fichier Excel.');

        return 1;
    }

    foreach (array_chunk($articles, 500) as $chunk) {
        DB::table('articles')->upsert(
            $chunk,
            ['source_row'],
            ['service_id', 'service_code_source', 'description', 'mouvement', 'date_mouvement', 'date_source', 'quantite_entree', 'quantite_sortie', 'numero_bon', 'observation', 'numero_inventaire', 'updated_at'],
        );
    }

    $this->info(count($articles).' articles importes ou mis a jour.');
    $this->warn($unlinkedServices.' lignes ont un code service non associe, conserve dans service_code_source.');

    if ($skippedRows > 0) {
        $this->warn($skippedRows.' ligne sans designation a ete ignoree.');
    }
})->purpose('Import inventory articles from an Excel GESTION file');

Artisan::command('articles:backfill-source-hashes', function () {
    $updated = 0;
    $duplicates = 0;

    Article::query()->whereNull('source_hash')->orderBy('id')->chunkById(500, function ($articles) use (&$updated, &$duplicates) {
        foreach ($articles as $article) {
            $hash = ArticleSourceHasher::make($article->getAttributes());

            if (Article::query()->where('source_hash', $hash)->exists()) {
                $duplicates++;

                continue;
            }

            $article->update(['source_hash' => $hash]);
            $updated++;
        }
    });

    $this->info($updated.' empreintes article calculees.');

    if ($duplicates > 0) {
        $this->warn($duplicates.' lignes identiques ont ete conservees sans empreinte unique.');
    }
})->purpose('Backfill hashes for existing inventory articles');
