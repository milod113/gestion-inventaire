<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use App\Models\Concerns\HasSource;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facture extends Model
{
    use Audited, HasFactory, HasSource;

    protected string $auditLabelColumn = 'numero_facture';

    protected array $auditExcept = ['service_reference_normalisee', 'valeurs_origine', 'corrigee_at'];

    /** Services destinataires d'une facture (reference normalisee => libelle affiche). */
    public const SERVICES = [
        'D.I.E.' => 'DIE',
        'DMM' => 'DMM',
        'PHARMACIE' => 'Pharmacie',
        'ECONOMAT' => 'Economat',
    ];

    /** Motifs proposes lors de la correction d'une facture importee. */
    public const MOTIFS_CORRECTION = [
        'erreur_montant' => 'Erreur de saisie du montant',
        'changement_fournisseur' => 'Changement de fournisseur',
        'rejet_cf' => 'Rejet du controle financier (CF)',
        'autre' => 'Autre',
    ];

    /** Champs modifiables dont la valeur importee d'origine est conservee. */
    public const CHAMPS_CORRIGEABLES = [
        'service_id', 'n_bon', 'service_reference', 'imputation', 'n_journal', 'numero_facture',
        'date_facture', 'montant', 'code_fournisseur', 'n_inventaire', 'cfac', 'n_mandat', 'date_mandat',
    ];

    protected $fillable = [
        'source',
        'service_id',
        'n_bon',
        'service_reference',
        'service_reference_normalisee',
        'imputation',
        'n_journal',
        'numero_facture',
        'date_facture',
        'date_facture_source',
        'montant',
        'code_fournisseur',
        'n_inventaire',
        'cfac',
        'n_mandat',
        'date_mandat',
        'date_mandat_source',
        'source_row',
        'import_batch_id',
        'source_hash',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'decimal:2',
            'valeurs_origine' => 'array',
            'corrigee_at' => 'datetime',
        ];
    }

    public function isCorrigee(): bool
    {
        return $this->corrigee_at !== null;
    }

    /**
     * Applique une correction sur une facture importee : conserve la valeur d'origine
     * de chaque champ modifie (une seule fois) et journalise la correction avec son motif.
     * Retourne false si aucune valeur n'a change.
     */
    public function corriger(array $data, string $motif): bool
    {
        $this->fill($data);
        $changed = array_intersect(array_keys($this->getDirty()), self::CHAMPS_CORRIGEABLES);
        if ($changed === []) {
            $this->syncOriginal();

            return false;
        }

        $origine = $this->valeurs_origine ?? [];
        foreach ($changed as $field) {
            if (! array_key_exists($field, $origine)) {
                $origine[$field] = $this->getOriginal($field);
            }
        }

        $this->valeurs_origine = $origine;
        $this->corrigee_at = now();
        $this->auditMotif = $motif;
        $this->save();

        return true;
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** Fournisseur rattache par son code (les factures importees n'ont pas toutes une fiche fournisseur). */
    public function fournisseur(): BelongsTo
    {
        return $this->belongsTo(Fournisseur::class, 'code_fournisseur', 'code');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailFacture::class);
    }
}
