<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Fournisseur extends Model
{
    protected $fillable = [
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
