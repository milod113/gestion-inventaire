<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = [
        'code',
        'name',
    ];

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    public function factures(): HasMany
    {
        return $this->hasMany(Facture::class);
    }
}
