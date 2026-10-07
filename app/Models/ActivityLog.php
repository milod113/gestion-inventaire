<?php

namespace App\Models;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'user_name', 'event', 'subject_type', 'subject_id',
        'label', 'old_values', 'new_values', 'ip_address',
    ];

    protected function casts(): array
    {
        return ['old_values' => 'array', 'new_values' => 'array', 'created_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(string $event, ?Model $subject = null, ?array $old = null, ?array $new = null, ?Authenticatable $user = null, ?string $label = null): self
    {
        $user ??= Auth::user();

        return static::create([
            'user_id' => $user?->getAuthIdentifier(),
            'user_name' => $user?->name ?? null,
            'event' => $event,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'label' => $label ?? ($subject && method_exists($subject, 'auditLabel') ? $subject->auditLabel() : null),
            'old_values' => $old ?: null,
            'new_values' => $new ?: null,
            'ip_address' => request()?->ip(),
        ]);
    }
}
