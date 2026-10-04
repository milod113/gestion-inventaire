<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>État des mouvements de stock</title>
    <style>
        @page { size: A4 landscape; margin: 9mm 10mm 14mm; }
        body { color: #202923; font-family: DejaVu Sans, sans-serif; font-size: 8px; }
        .masthead { width: 100%; border-bottom: 2px solid #285b43; margin-bottom: 10px; padding-bottom: 8px; }
        .masthead td { vertical-align: middle; }
        .logo { width: 58px; height: 58px; }
        .institution { text-align: center; line-height: 1.55; }
        .institution .chu { color: #173e2d; font-size: 14px; font-weight: bold; text-transform: uppercase; }
        .institution .direction { font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .institution .office { font-size: 9px; }
        .meta { width: 100%; margin: 10px 0; }
        .meta td { padding: 3px 0; }
        .title { margin: 10px 0 3px; color: #173e2d; text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .subtitle { margin: 0 0 10px; color: #58675e; text-align: center; font-size: 8px; }
        .service-heading { margin: 12px 0 0; padding: 6px 8px; border: 1px solid #285b43; background: #e8efe9; color: #173e2d; font-size: 9px; font-weight: bold; page-break-after: avoid; }
        .service-heading small { color: #58675e; font-size: 7px; font-weight: normal; }
        table.data { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8px; }
        .data th, .data td { border: 1px solid #829087; padding: 5px 4px; vertical-align: top; overflow-wrap: break-word; }
        .data th { background: #f4f7f4; color: #173e2d; text-align: center; font-size: 7px; }
        .data td { font-size: 7px; }
        .data .description { width: 22%; }
        .data .movement { width: 8%; text-align: center; }
        .data .date { width: 10%; text-align: center; }
        .data .quantity { width: 9%; text-align: center; }
        .data .bon { width: 11%; }
        .data .observation { width: 22%; }
        .data .inventory { width: 18%; }
        .data tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        .footer { position: fixed; bottom: -8mm; left: 0; right: 0; color: #637168; font-size: 7px; text-align: right; }
    </style>
</head>
<body>
    <table class="masthead">
        <tr>
            <td style="width: 70px">@if ($logo)<img class="logo" src="{{ $logo }}" alt="Logo CHU">@endif</td>
            <td class="institution">
                <div class="chu">Centre Hospitalo-Universitaire Damerdji Tidjani</div>
                <div class="direction">Direction des moyens et matériel</div>
                <div class="direction">Sous-direction des services économiques</div>
                <div class="office">Bureau d'inventaire</div>
            </td>
            <td style="width: 70px"></td>
        </tr>
    </table>

    <div class="title">État des mouvements de stock</div>
    <div class="subtitle">Document généré le {{ $generatedAt }} · {{ $articles->count() }} article(s)</div>

    <table class="meta">
        <tr>
            <td><strong>Recherche :</strong> {{ $search !== '' ? $search : 'Toutes les valeurs' }}</td>
            <td style="text-align: right"><strong>Service recherché :</strong> {{ $service ? $service->code.' — '.$service->name : ($serviceCode ?: 'Tous les services') }}</td>
        </tr>
    </table>

    @forelse ($serviceGroups as $group)
        <div class="service-heading">
            Service {{ $group['code'] ?: '—' }} — {{ $group['name'] }}
            <small>({{ $group['articles']->count() }} article(s))</small>
        </div>
        <table class="data">
            <thead><tr>
                <th class="description">Description</th>
                <th class="movement">Mouvement</th>
                <th class="date">Date mouvement</th>
                <th class="quantity">Quantité entrée</th>
                <th class="quantity">Quantité sortie</th>
                <th class="bon">Numéro bon</th>
                <th class="observation">Observation</th>
                <th class="inventory">Numéro inventaire</th>
            </tr></thead>
            <tbody>
            @foreach ($group['articles'] as $article)
                <tr>
                    <td>{{ $article->description }}</td>
                    <td class="movement">{{ $article->mouvement ?: '—' }}</td>
                    <td class="date">{{ $article->date_mouvement?->format('d/m/Y') ?? '—' }}</td>
                    <td class="quantity">{{ $article->quantite_entree ?? '—' }}</td>
                    <td class="quantity">{{ $article->quantite_sortie ?? '—' }}</td>
                    <td>{{ $article->numero_bon ?: '—' }}</td>
                    <td>{{ $article->observation ?: '—' }}</td>
                    <td>{{ $article->numero_inventaire ?: '—' }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
    @empty
        <p style="text-align:center">Aucun article correspondant aux filtres.</p>
    @endforelse

    <div class="footer">CHU Tlemcen · Bureau d'inventaire</div>
</body>
</html>
