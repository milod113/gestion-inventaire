<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'telephone',
        'password',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** Stored in a canonical form so every way of typing a number reaches the same account. */
    protected function telephone(): Attribute
    {
        return Attribute::set(fn (?string $value) => self::normalizePhone($value));
    }

    /**
     * Keeps digits only and turns an international Algerian prefix into the local one
     * ("+213 555 12 34 56" and "0555-123456" both become "0555123456").
     */
    public static function normalizePhone(?string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if (str_starts_with($digits, '00213')) {
            $digits = substr($digits, 2);
        }
        if (str_starts_with($digits, '213') && strlen($digits) >= 11) {
            $digits = '0'.substr($digits, 3);
        }

        return $digits === '' ? null : $digits;
    }

    /** Validation rules shared by the admin form and the profile form. */
    public static function telephoneRules(?self $ignore = null): array
    {
        return [
            'nullable',
            'string',
            'regex:/^\+?[\d\s.\-()]{8,20}$/',
            function (string $attribute, mixed $value, \Closure $fail) use ($ignore) {
                $phone = self::normalizePhone($value);
                if ($phone && self::query()->where('telephone', $phone)->when($ignore, fn ($query) => $query->whereKeyNot($ignore->id))->exists()) {
                    $fail('Ce numero de telephone est deja utilise par un autre compte.');
                }
            },
        ];
    }
}
