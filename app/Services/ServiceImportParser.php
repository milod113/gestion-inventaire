<?php

namespace App\Services;

use RuntimeException;

class ServiceImportParser
{
    public function parse(string $path): array
    {
        $data = file_get_contents($path);
        if ($data === false || strlen($data) < 33) {
            throw new RuntimeException('Fichier DBF service invalide.');
        }

        $count = unpack('Vcount', substr($data, 4, 4))['count'];
        $header = unpack('vlength', substr($data, 8, 2))['length'];
        $recordLength = unpack('vlength', substr($data, 10, 2))['length'];
        $fields = [];
        $fieldOffset = 1;

        for ($offset = 32; $offset + 32 <= $header && ord($data[$offset]) !== 13; $offset += 32) {
            $length = ord($data[$offset + 16]);
            $fields[rtrim(substr($data, $offset, 11), "\0 ")] = ['offset' => $fieldOffset, 'length' => $length, 'type' => $data[$offset + 11]];
            $fieldOffset += $length;
        }

        if (! isset($fields['CODE'], $fields['SERVICE'])) {
            throw new RuntimeException('Le fichier DBF doit contenir les colonnes CODE et SERVICE.');
        }

        $items = [];
        $invalidRows = 0;

        for ($index = 0; $index < $count; $index++) {
            $record = substr($data, $header + ($index * $recordLength), $recordLength);
            if ($record === '' || $record[0] === '*') {
                continue;
            }

            $values = [];
            foreach (['CODE', 'SERVICE'] as $name) {
                $field = $fields[$name];
                $value = trim(substr($record, $field['offset'], $field['length']));
                $values[$name] = in_array($field['type'], ['C', 'M'], true)
                    ? trim(iconv('CP850', 'UTF-8//IGNORE', $value) ?: $value)
                    : $value;
            }

            $code = trim($values['CODE']);
            $name = trim($values['SERVICE']);
            if (! ctype_digit($code) || $name === '') {
                $invalidRows++;
                continue;
            }

            $item = [
                'source_row' => $index + 1,
                'code' => (int) $code,
                'name' => $name,
            ];
            $item['source_hash'] = hash('sha256', strtoupper($item['code'].'|'.$item['name']));
            $items[] = $item;
        }

        return ['services' => $items, 'invalid_rows' => $invalidRows];
    }
}
