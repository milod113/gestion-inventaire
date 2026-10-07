<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use App\Models\Concerns\HasSource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use Audited, HasSource;

    protected string $auditLabelColumn = 'name';

    protected $fillable = [
        'source',
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
