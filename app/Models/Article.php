<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use App\Models\Concerns\HasSource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Article extends Model
{
    use Audited, HasSource;

    protected string $auditLabelColumn = 'description';

    protected $fillable = [
        'source',
        'service_id',
        'import_batch_id',
        'service_code_source',
        'description',
        'prix_unitaire',
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
            'prix_unitaire' => 'decimal:2',
            'quantite_entree' => 'decimal:3',
            'quantite_sortie' => 'decimal:3',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function detailFacture(): HasOne
    {
        return $this->hasOne(DetailFacture::class);
    }

    public function importBatch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class);
    }
}
