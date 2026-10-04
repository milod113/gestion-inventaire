<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdvancedImportScanFile extends Model
{
    protected $fillable = ['advanced_import_scan_id', 'path', 'name', 'type', 'status', 'file_hash', 'records', 'fields', 'error'];
    protected function casts(): array { return ['fields' => 'array']; }
}
