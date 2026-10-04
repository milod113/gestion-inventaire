<?php

namespace App\Services;

use RuntimeException;

class FournisseurImportParser
{
    public function parse(string $path): array
    {
        $data = file_get_contents($path);
        if ($data === false || strlen($data) < 33) throw new RuntimeException('Fichier DBF fournisseur invalide.');
        $count = unpack('Vcount', substr($data, 4, 4))['count']; $header = unpack('vlength', substr($data, 8, 2))['length']; $recordLength = unpack('vlength', substr($data, 10, 2))['length'];
        $fields = []; $fieldOffset = 1;
        for ($offset = 32; $offset + 32 <= $header && ord($data[$offset]) !== 13; $offset += 32) { $length = ord($data[$offset + 16]); $fields[] = ['name' => rtrim(substr($data, $offset, 11), "\0 "), 'offset' => $fieldOffset, 'length' => $length, 'type' => $data[$offset + 11]]; $fieldOffset += $length; }
        $items = [];
        for ($index = 0; $index < $count; $index++) { $record = substr($data, $header + ($index * $recordLength), $recordLength); if ($record === '' || $record[0] === '*') continue; $v = []; foreach ($fields as $f) { $value = trim(substr($record, $f['offset'], $f['length'])); $v[$f['name']] = in_array($f['type'], ['C','M'], true) ? trim(iconv('CP850', 'UTF-8//IGNORE', $value) ?: $value) : $value; } $code = trim($v['CODE_FORN'] ?? ''); $name = trim($v['APPELATION'] ?? ''); if ($code === '' && $name === '') continue; $item = ['source_row' => $index + 1, 'code' => $code ?: null, 'appellation' => $name ?: null, 'adresse' => trim($v['ADRESSE'] ?? '') ?: null, 'rc_autres' => trim($v['RC_AUTRES'] ?? '') ?: null, 'cb_autres' => trim($v['CB_AUTRES'] ?? '') ?: null, 'telephone' => trim($v['N_TELPHONE'] ?? '') ?: null, 'telex' => trim($v['N_TELEX'] ?? '') ?: null, 'artv' => trim($v['ARTV'] ?? '') ?: null, 'observation' => trim($v['OBSERVATIO'] ?? '') ?: null]; $item['source_hash'] = hash('sha256', strtoupper(implode('|', [$item['code'], $item['appellation'], $item['adresse'], $item['telephone']]))); $items[] = $item; }
        return ['fournisseurs' => $items, 'invalid_rows' => 0];
    }
}
