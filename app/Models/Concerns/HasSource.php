<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait HasSource
{
    public const SOURCE_IMPORT = 'import';
    public const SOURCE_SAISIE = 'saisie';

    public function isImported(): bool
    {
        return $this->source === self::SOURCE_IMPORT;
    }

    public function scopeFromSource(Builder $query, ?string $source): Builder
    {
        return in_array($source, [self::SOURCE_IMPORT, self::SOURCE_SAISIE], true)
            ? $query->where($query->getModel()->getTable().'.source', $source)
            : $query;
    }
}
