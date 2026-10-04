<?php

namespace App\Services;

use RuntimeException;

class FactureImportParser
{
    public function parse(string $path): array
    {
        if (strtolower(pathinfo($path, PATHINFO_EXTENSION)) !== 'dbf') {
            throw new RuntimeException('Le centre d import accepte les archives FACTURE au format DBF.');
        }

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

        $factures = [];
        $invalidRows = 0;

        for ($index = 0; $index < $recordCount; $index++) {
            $record = substr($contents, $headerLength + ($index * $recordLength), $recordLength);

            if ($record === '' || $record[0] === '*') {
                continue;
            }

            $values = [];
            foreach ($fields as $field) {
                $values[$field['name']] = $this->decode(trim(substr($record, $field['offset'], $field['length'])), $field['type']);
            }

            $number = trim($values['FACT'] ?? '');
            $bon = trim($values['N_BON'] ?? '');
            if ($number === '' && $bon === '') {
                $invalidRows++;
                continue;
            }

            $dateSource = trim($values['DATE'] ?? '');
            $facture = [
                'source_row' => $index + 1,
                'n_bon' => $bon ?: null,
                'service_reference' => trim($values['SERVICE'] ?? '') ?: null,
                'service_reference_normalisee' => ServiceReferenceNormalizer::normalize($values['SERVICE'] ?? null),
                'imputation' => trim($values['IMPUTATION'] ?? '') ?: null,
                'n_journal' => trim($values['N_JOURNAL'] ?? '') ?: null,
                'numero_facture' => $number ?: null,
                'date_facture' => $this->date($dateSource),
                'date_facture_source' => $dateSource ?: null,
                'montant' => $this->number($values['MONTANT'] ?? ''),
                'code_fournisseur' => trim($values['CODE_FORN'] ?? '') ?: null,
                'n_inventaire' => trim($values['N_INV'] ?? '') ?: null,
                'cfac' => trim($values['CFAC'] ?? '') ?: null,
                'n_mandat' => null,
                'date_mandat' => null,
                'date_mandat_source' => null,
            ];
            $facture['source_hash'] = FactureSourceHasher::make($facture);
            $factures[] = $facture;
        }

        return ['factures' => $factures, 'invalid_rows' => $invalidRows];
    }

    private function decode(string $value, string $type): string
    {
        return in_array($type, ['C', 'M'], true) && $value !== '' ? trim(iconv('CP850', 'UTF-8//IGNORE', $value) ?: $value) : $value;
    }

    private function date(string $value): ?string
    {
        if (! preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $matches)) return null;
        [, $year, $month, $day] = $matches;
        $year = (int) $year;
        if ($year >= 1900 && $year <= 1925) $year += 100;
        return checkdate((int) $month, (int) $day, $year) ? sprintf('%04d-%02d-%02d', $year, $month, $day) : null;
    }

    private function number(string $value): ?string
    {
        $value = str_replace(',', '.', preg_replace('/\s+/', '', trim($value)));
        return is_numeric($value) ? $value : null;
    }
}
