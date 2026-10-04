<?php

namespace App\Services;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;

class DbfFolderScanner
{
    private const ALLOWED_ROOTS = ['C:\\Users\\ACER\\Desktop\\invent', 'C:\\xampp\\htdocs\\gestion-inventaire\\data-inventaire'];

    public function scan(string $path): array
    {
        $realPath = realpath($path);

        if ($realPath === false || ! is_dir($realPath) || ! $this->allowed($realPath)) {
            throw new RuntimeException('Le dossier est inaccessible ou ne fait pas partie des emplacements autorises.');
        }

        $files = [];
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($realPath, RecursiveDirectoryIterator::SKIP_DOTS)) as $file) {
            if (! $file->isFile() || strtolower($file->getExtension()) !== 'dbf') continue;
            $files[] = $this->inspect($file->getPathname(), $realPath);
        }

        return $files;
    }

    public function allowedFile(string $path): ?string
    {
        $realPath = realpath($path);
        return $realPath && is_file($realPath) && strtolower(pathinfo($realPath, PATHINFO_EXTENSION)) === 'dbf' && $this->allowed($realPath) ? $realPath : null;
    }

    private function inspect(string $path, string $root): array
    {
        $contents = file_get_contents($path, false, null, 0, 4096);
        if ($contents === false || strlen($contents) < 33) return $this->result($path, $root, 'incompatible', [], 0);
        $count = unpack('Vcount', substr($contents, 4, 4))['count'];
        $length = unpack('vlength', substr($contents, 8, 2))['length'];
        $recordLength = unpack('vlength', substr($contents, 10, 2))['length'];
        $fields = [];
        $dateOffset = null; $fieldOffset = 1;
        for ($offset = 32; $offset + 32 <= $length && ord($contents[$offset]) !== 0x0D; $offset += 32) { $name = rtrim(substr($contents, $offset, 11), "\0 "); $fields[] = $name; if ($name === 'DATE') $dateOffset = $fieldOffset; $fieldOffset += ord($contents[$offset + 16]); }
        $type = match (true) {
            $this->has($fields, ['DES', 'CMVT', 'QTE_E', 'QTE_S']) => 'gestion',
            $this->has($fields, ['N_BON', 'FACT', 'MONTANT', 'CODE_FORN']) => 'facture',
            $this->has($fields, ['APPELATION', 'ADRESSE', 'CODE_FORN']) => 'fournisseur',
            $this->has($fields, ['CODE', 'SERVICE']) => 'service',
            default => 'inconnu',
        };
        [$dateFrom, $dateTo] = $dateOffset === null ? [null, null] : $this->period($path, $length, $recordLength, $count, $dateOffset);
        return $this->result($path, $root, $type, $fields, $count, $dateFrom, $dateTo);
    }

    private function result(string $path, string $root, string $type, array $fields, int $count, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        return ['name' => basename($path), 'relative_path' => ltrim(str_replace($root, '', $path), '\\/'), 'full_path' => $path, 'type' => $type, 'fields' => $fields, 'records' => $count, 'date_from' => $dateFrom, 'date_to' => $dateTo, 'size' => filesize($path) ?: 0, 'file_hash' => hash_file('sha256', $path) ?: null, 'status' => in_array($type, ['gestion', 'facture', 'fournisseur', 'service'], true) ? 'pret' : 'a_verifier'];
    }

    private function period(string $path, int $headerLength, int $recordLength, int $count, int $dateOffset): array
    {
        $handle = fopen($path, 'rb'); $dates = [];
        if (! $handle) return [null, null];
        for ($index = 0; $index < $count; $index++) { fseek($handle, $headerLength + ($index * $recordLength) + $dateOffset); $value = trim((string) fread($handle, 8)); if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $m)) { $year = (int) $m[1]; if ($year >= 1900 && $year <= 1925) $year += 100; if (checkdate((int) $m[2], (int) $m[3], $year)) $dates[] = sprintf('%04d-%02d-%02d', $year, $m[2], $m[3]); } }
        fclose($handle); return $dates === [] ? [null, null] : [min($dates), max($dates)];
    }

    private function has(array $fields, array $required): bool { return count(array_intersect($required, $fields)) === count($required); }
    private function allowed(string $path): bool { foreach (self::ALLOWED_ROOTS as $root) { $resolved = realpath($root); if ($resolved && str_starts_with(strtolower($path), strtolower($resolved))) return true; } return false; }
}
