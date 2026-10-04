<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImportBatch extends Model
{
    protected $fillable = [
        'type', 'original_name', 'stored_path', 'status', 'total_rows', 'ready_rows',
        'duplicate_rows', 'conflict_rows', 'invalid_rows', 'imported_rows', 'date_from', 'date_to',
    ];

    protected function casts(): array
    {
        return ['date_from' => 'date', 'date_to' => 'date'];
    }

    public function rows(): HasMany
    {
        return $this->hasMany(ImportRow::class);
    }
}
