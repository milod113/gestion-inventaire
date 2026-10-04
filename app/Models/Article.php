<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Article extends Model
{
    protected $fillable = [
        'service_id',
        'import_batch_id',
        'service_code_source',
        'description',
        'mouvement',
        'date_mouvement',
        'date_source',
        'quantite_entree',
        'quantite_sortie',
        'numero_bon',
        'observation',
        'numero_inventaire',
        'source_row',
        'source_hash',
    ];

    protected function casts(): array
    {
        return [
            'date_mouvement' => 'date',
            'quantite_entree' => 'decimal:3',
            'quantite_sortie' => 'decimal:3',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function importBatch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class);
    }
}
