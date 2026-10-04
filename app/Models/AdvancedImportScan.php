<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdvancedImportScan extends Model
{
    protected $fillable = ['path', 'user_id', 'files_count', 'ready_count', 'error_count'];

    public function files(): HasMany { return $this->hasMany(AdvancedImportScanFile::class); }
}
