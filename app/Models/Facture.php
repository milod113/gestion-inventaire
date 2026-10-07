<?php

namespace App\Models;

use App\Models\Concerns\HasSource;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facture extends Model
{
    use HasFactory, HasSource;

    protected $fillable = [
        'source',
        'service_id',
        'n_bon',
        'service_reference',
        'service_reference_normalisee',
        'imputation',
        'n_journal',
        'numero_facture',
        'date_facture',
        'date_facture_source',
        'montant',
        'code_fournisseur',
        'n_inventaire',
        'cfac',
        'n_mandat',
        'date_mandat',
        'date_mandat_source',
        'source_row',
        'import_batch_id',
        'source_hash',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'decimal:2',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailFacture::class);
    }
}
