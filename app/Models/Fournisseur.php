<?php

namespace App\Models;

use App\Models\Concerns\HasSource;
use Illuminate\Database\Eloquent\Model;

class Fournisseur extends Model
{
    use HasSource;

    protected $fillable = [
        'source',
        'code',
        'source_hash',
        'import_batch_id',
        'appellation',
        'adresse',
        'rc_autres',
        'cb_autres',
        'telephone',
        'telex',
        'artv',
        'observation',
    ];
}
