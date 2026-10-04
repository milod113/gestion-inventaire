<?php

namespace App\Services;

class ServiceReferenceNormalizer
{
    public static function normalize(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') return null;
        $key = strtoupper(preg_replace('/[^A-Z0-9]+/', '', $value));

        return match ($key) {
            'ECONOMAT', 'CONOMAT', 'ECONNOMAT', 'ECINOMAT', 'ECNOMAT', 'ECOMOMAT', 'ECOMONAT', 'ECONMAT', 'ECONOAMT', 'ECONOMA', 'ECONOMATI', 'ECONOMET', 'ECONOMMAT', 'EONOMAT', 'ECONOME' => 'ECONOMAT',
            'PHARMACI', 'PHARMACIE' => 'PHARMACIE',
            'DMM' => 'DMM',
            'DIE' => 'D.I.E.',
            default => strtoupper($value),
        };
    }
}
