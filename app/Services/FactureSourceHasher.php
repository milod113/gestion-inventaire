<?php

namespace App\Services;

class FactureSourceHasher
{
    public static function make(array $facture): string
    {
        $fields = ['n_bon', 'service_reference', 'imputation', 'n_journal', 'numero_facture', 'date_facture_source', 'montant', 'code_fournisseur', 'n_inventaire', 'cfac', 'n_mandat', 'date_mandat_source'];

        return hash('sha256', implode('|', array_map(
            fn (string $field) => strtoupper(trim((string) ($facture[$field] ?? ''))),
            $fields,
        )));
    }
}
