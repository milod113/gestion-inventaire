<?php

namespace App\Services;

class ArticleSourceHasher
{
    public static function make(array $article): string
    {
        $fields = [
            'service_code_source', 'description', 'mouvement', 'date_source',
            'quantite_entree', 'quantite_sortie', 'numero_bon', 'numero_inventaire',
        ];

        $values = array_map(
            fn (string $field) => self::normalise($article[$field] ?? null),
            $fields,
        );

        return hash('sha256', implode('|', $values));
    }

    private static function normalise(mixed $value): string
    {
        return strtoupper(preg_replace('/\s+/', ' ', trim((string) $value)));
    }
}
