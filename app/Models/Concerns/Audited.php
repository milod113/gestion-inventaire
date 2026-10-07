<?php

namespace App\Models\Concerns;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Renseigne created_by / updated_by et alimente le journal d'activite.
 * Les imports en masse (upsert) ne declenchent pas ces evenements: ils sont journalises par lot.
 */
trait Audited
{
    public static function bootAudited(): void
    {
        static::creating(function ($model) {
            if ($id = Auth::id()) {
                $model->created_by ??= $id;
                $model->updated_by ??= $id;
            }
        });

        static::updating(function ($model) {
            if (($id = Auth::id()) && $model->isDirty()) {
                $model->updated_by = $id;
            }
        });

        static::created(fn ($model) => ActivityLog::record('created', $model, null, $model->auditValues($model->getAttributes())));

        static::updated(function ($model) {
            $new = $model->auditValues($model->getChanges());
            if ($new === []) {
                return;
            }
            ActivityLog::record('updated', $model, array_intersect_key($model->getOriginal(), $new), $new);
        });

        static::deleted(fn ($model) => ActivityLog::record('deleted', $model, $model->auditValues($model->getAttributes())));
    }

    public function auditLabel(): string
    {
        return (string) ($this->{$this->auditLabelColumn ?? 'id'} ?? $this->getKey());
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    private function auditValues(array $values): array
    {
        $ignored = ['created_at', 'updated_at', 'created_by', 'updated_by', 'source_hash'];

        return array_filter(
            array_diff_key($values, array_flip($ignored)),
            fn ($value) => $value !== null && $value !== '',
        );
    }
}
