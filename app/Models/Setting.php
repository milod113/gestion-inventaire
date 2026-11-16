<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Application settings stored as one JSON document per key (e.g. "pdf"). */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value', 'updated_by'];

    public function updatedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    protected function casts(): array
    {
        return ['value' => 'array'];
    }

    public static function read(string $key, array $default = []): array
    {
        return static::query()->find($key)?->value ?? $default;
    }

    public static function write(string $key, array $value, ?int $userId = null): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value, 'updated_by' => $userId]);
    }
}
