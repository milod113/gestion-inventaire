<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Fiche d'inventaire</title>
    <style>
        @page { size: A4 landscape; margin: 9mm 10mm 14mm; }
        body { color: #292420; font-family: DejaVu Sans, sans-serif; font-size: 8px; }
        .masthead { width: 100%; border-bottom: 2px solid #c2410c; margin-bottom: 10px; padding-bottom: 8px; }
        .masthead td { vertical-align: middle; }
        .logo { width: 58px; height: 58px; }
        .institution { text-align: center; line-height: 1.55; }
        .institution .chu { color: #9a3412; font-size: 14px; font-weight: bold; text-transform: uppercase; }
        .institution .direction { font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .institution .office { font-size: 9px; }
        .meta { width: 100%; margin: 10px 0; }
        .meta td { padding: 3px 0; }
        .title { margin: 10px 0 3px; color: #9a3412; text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .subtitle { margin: 0 0 10px; color: #665e59; text-align: center; font-size: 8px; }
        .service-heading { margin: 12px 0 0; padding: 6px 8px; border: 1px solid #c2410c; background: #f3eae4; color: #9a3412; font-size: 9px; font-weight: bold; page-break-after: avoid; }
        .service-heading small { color: #665e59; font-size: 7px; font-weight: normal; }
        table.data { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8px; }
        .data th, .data td { border: 1px solid #8f8883; padding: 5px 4px; vertical-align: top; overflow-wrap: break-word; }
        .data th { background: #f9f5f2; color: #9a3412; text-align: center; font-size: 11px; }
        .data td { font-size: 11px; }
        .data .description { width: 22%; }
        .data .movement { width: 9%; text-align: center; }
        .data .date { width: 9%; text-align: center; }
        .data .quantity { width: 6%; text-align: center; }
        .data .bon { width: 10%; }
        .data .observation { width: 23%; }
        .data .inventory { width: 15%; }
        .data tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        .footer { position: fixed; bottom: -8mm; left: 0; right: 0; color: #706964; font-size: 7px; text-align: right; }
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

    <div class="title">Fiche d'inventaire</div>
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
                <th class="quantity">Qte E</th>
                <th class="quantity">Qte S</th>
                <th class="bon">Numéro bon</th>
                <th class="inventory">Numéro inventaire</th>
                <th class="observation">Observation</th>
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
                    <td>{{ $article->numero_inventaire ?: '—' }}</td>
                    <td>{{ $article->observation ?: '—' }}</td>
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
