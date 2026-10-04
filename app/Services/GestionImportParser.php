<?php

namespace App\Services;

use DOMDocument;
use RuntimeException;
use ZipArchive;

class GestionImportParser
{
    public function parse(string $path): array
    {
        if (strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'dbf') {
            return $this->parseDbf($path);
        }

        $archive = new ZipArchive();

        if ($archive->open($path) !== true) {
            throw new RuntimeException('Impossible d ouvrir le fichier Excel.');
        }

        $sharedStringsXml = $archive->getFromName('xl/sharedStrings.xml');
        $worksheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');
        $archive->close();

        if ($sharedStringsXml === false || $worksheetXml === false) {
            throw new RuntimeException('La feuille Excel attendue est introuvable.');
        }

        $sharedStringsDocument = new DOMDocument();
        $worksheetDocument = new DOMDocument();

        if (! $sharedStringsDocument->loadXML($sharedStringsXml) || ! $worksheetDocument->loadXML($worksheetXml)) {
            throw new RuntimeException('Le contenu du fichier Excel est invalide.');
        }

        $sharedStrings = [];

        foreach ($sharedStringsDocument->getElementsByTagName('si') as $string) {
            $sharedStrings[] = trim($string->textContent);
        }

        $articles = [];
        $invalidRows = 0;

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
                $invalidRows++;

                continue;
            }

            $dateSource = trim($cells['D'] ?? '');
            $article = [
                'source_row' => (int) $row->getAttribute('r'),
                'service_code_source' => trim($cells['A'] ?? '') ?: null,
                'description' => $description,
                'mouvement' => trim($cells['C'] ?? '') ?: null,
                'date_mouvement' => $this->normaliseDate($dateSource),
                'date_source' => $dateSource ?: null,
                'quantite_entree' => $this->normaliseNumber($cells['E'] ?? ''),
                'quantite_sortie' => $this->normaliseNumber($cells['F'] ?? ''),
                'numero_bon' => trim($cells['G'] ?? '') ?: null,
                'observation' => trim($cells['H'] ?? '') ?: null,
                'numero_inventaire' => trim($cells['I'] ?? '') ?: null,
            ];
            $article['source_hash'] = ArticleSourceHasher::make($article);
            $articles[] = $article;
        }

        return ['articles' => $articles, 'invalid_rows' => $invalidRows];
    }

    private function parseDbf(string $path): array
    {
        $contents = file_get_contents($path);

        if ($contents === false || strlen($contents) < 33) {
            throw new RuntimeException('Le fichier DBF est invalide ou illisible.');
        }

        $recordCount = unpack('Vcount', substr($contents, 4, 4))['count'];
        $headerLength = unpack('vlength', substr($contents, 8, 2))['length'];
        $recordLength = unpack('vlength', substr($contents, 10, 2))['length'];
        $fields = [];
        $offset = 32;
        $fieldOffset = 1;

        while ($offset + 32 <= $headerLength && ord($contents[$offset]) !== 0x0D) {
            $descriptor = substr($contents, $offset, 32);
            $length = ord($descriptor[16]);
            $fields[] = ['name' => rtrim(substr($descriptor, 0, 11), "\0 "), 'type' => $descriptor[11], 'offset' => $fieldOffset, 'length' => $length];
            $fieldOffset += $length;
            $offset += 32;
        }

        $articles = [];
        $invalidRows = 0;

        for ($index = 0; $index < $recordCount; $index++) {
            $record = substr($contents, $headerLength + ($index * $recordLength), $recordLength);

            if ($record === '' || $record[0] === '*') {
                continue;
            }

            $values = [];

            foreach ($fields as $field) {
                $value = rtrim(substr($record, $field['offset'], $field['length']));
                $values[$field['name']] = $this->decodeDbfValue($value, $field['type']);
            }

            $description = trim($values['DES'] ?? '');

            if ($description === '') {
                $invalidRows++;

                continue;
            }

            $dateSource = trim($values['DATE'] ?? '');
            $article = [
                'source_row' => $index + 1,
                'service_code_source' => trim($values['CODE'] ?? '') ?: null,
                'description' => $description,
                'mouvement' => trim($values['CMVT'] ?? '') ?: null,
                'date_mouvement' => $this->normaliseDate($dateSource),
                'date_source' => $dateSource ?: null,
                'quantite_entree' => $this->normaliseNumber($values['QTE_E'] ?? ''),
                'quantite_sortie' => $this->normaliseNumber($values['QTE_S'] ?? ''),
                'numero_bon' => trim($values['NUM_BON'] ?? '') ?: null,
                'observation' => trim($values['OBS'] ?? '') ?: null,
                'numero_inventaire' => trim($values['N_INV'] ?? '') ?: null,
            ];
            $article['source_hash'] = ArticleSourceHasher::make($article);
            $articles[] = $article;
        }

        return ['articles' => $articles, 'invalid_rows' => $invalidRows];
    }

    private function decodeDbfValue(string $value, string $type): string
    {
        $value = trim($value);

        if ($value === '') {
            return '';
        }

        return in_array($type, ['C', 'M'], true)
            ? trim(iconv('CP850', 'UTF-8//IGNORE', $value) ?: $value)
            : $value;
    }

    private function normaliseDate(string $value): ?string
    {
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', trim($value), $matches)) {
            [, $year, $month, $day] = $matches;
        } elseif (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', trim($value), $matches)) {
            [, $day, $month, $year] = $matches;
        } else {
            return null;
        }

        $year = (int) $year;

        if ($year >= 1900 && $year <= 1925) {
            $year += 100;
        }

        return checkdate((int) $month, (int) $day, $year)
            ? sprintf('%04d-%02d-%02d', $year, $month, $day)
            : null;
    }

    private function normaliseNumber(string $value): ?string
    {
        $value = str_replace(',', '.', preg_replace('/\s+/', '', trim($value)));

        return is_numeric($value) ? $value : null;
    }
}
