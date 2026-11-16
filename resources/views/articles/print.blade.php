@php
    use App\Support\FicheInventairePdf;

    $doc = $settings['document'];
    $page = $settings['page'];
    $lines = array_values(array_filter($settings['header']['lines'], fn ($line) => trim((string) $line) !== ''));
    $signatures = array_values(array_filter($settings['signatures']['labels'], fn ($label) => trim((string) $label) !== ''));
    $size = (int) $page['font_size'];
    $totalKeys = ['quantite_entree', 'quantite_sortie', 'valeur'];
    $showTotals = $doc['show_totals'] && collect($columns)->pluck('key')->intersect($totalKeys)->isNotEmpty();
    $grandTotals = collect($totalKeys)->mapWithKeys(fn ($key) => [$key => $groups->sum(fn ($group) => $group['totals'][$key])]);
    $formatTotal = fn (string $key, float $value) => number_format($value, $key === 'valeur' ? 2 : 0, ',', ' ');
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $doc['title'] }}</title>
    <style>
        @page { margin: 9mm 10mm 14mm; }
        body { color: #292420; font-family: '{{ $page['font'] }}', sans-serif; font-size: {{ $size - 3 }}px; }
        .masthead { width: 100%; border-bottom: 2px solid {{ $colors['accent'] }}; margin-bottom: 10px; padding-bottom: 8px; }
        .masthead td { vertical-align: middle; }
        .logo { width: 58px; height: 58px; }
        .institution { text-align: center; line-height: 1.55; }
        .institution .line-0 { color: {{ $colors['dark'] }}; font-size: 14px; font-weight: bold; text-transform: uppercase; }
        .institution .line-1, .institution .line-2 { font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .institution .line-3, .institution .line-4 { font-size: 9px; }
        .meta { width: 100%; margin: 10px 0; }
        .meta td { padding: 3px 0; }
        .title { margin: 10px 0 3px; color: {{ $colors['dark'] }}; text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .subtitle { margin: 0 0 10px; color: #665e59; text-align: center; font-size: 8px; }
        .group-heading { margin: 12px 0 0; padding: 6px 8px; border: 1px solid {{ $colors['accent'] }}; background: {{ $colors['tint'] }}; color: {{ $colors['dark'] }}; font-size: 9px; font-weight: bold; page-break-after: avoid; }
        .group-heading small { color: #665e59; font-size: 7px; font-weight: normal; }
        table.data { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8px; }
        .data th, .data td { border: 1px solid #8f8883; padding: 5px 4px; vertical-align: top; overflow-wrap: break-word; }
        .data th { background: {{ $colors['tint'] }}; color: {{ $colors['dark'] }}; text-align: center; font-size: {{ $size }}px; }
        .data td { font-size: {{ $size }}px; }
        .data .numeric { text-align: right; white-space: nowrap; }
        .data .centered { text-align: center; white-space: nowrap; }
        .data tr { page-break-inside: avoid; }
        .data tr.zebra td { background: {{ $colors['zebra'] }}; }
        .data tr.total td { background: {{ $colors['tint'] }}; color: {{ $colors['dark'] }}; font-weight: bold; }
        thead { display: table-header-group; }
        .grand-total { margin-top: 6px; text-align: right; font-size: {{ $size }}px; font-weight: bold; color: {{ $colors['dark'] }}; }
        .signatures { width: 100%; margin-top: 28px; page-break-inside: avoid; }
        .signatures td { text-align: center; vertical-align: top; font-size: {{ $size }}px; font-weight: bold; padding: 0 10px; }
        .signatures .space { height: 60px; }
        .footer { position: fixed; bottom: -8mm; left: 0; right: 0; width: 100%; color: #706964; font-size: 7px; }
        .preview-band { position: fixed; top: -7mm; right: 0; color: {{ $colors['accent'] }}; font-size: 7px; font-weight: bold; }
    </style>
</head>
<body>
    @if ($preview)
        <div class="preview-band">APERÇU — {{ $count }} article(s) d exemple</div>
    @endif

    @if ($logo || $lines)
        <table class="masthead">
            <tr>
                <td style="width: 70px">@if ($logo)<img class="logo" src="{{ $logo }}" alt="Logo">@endif</td>
                <td class="institution">
                    @foreach ($lines as $index => $line)
                        <div class="line-{{ $index }}">{{ $line }}</div>
                    @endforeach
                </td>
                <td style="width: 70px"></td>
            </tr>
        </table>
    @endif

    <div class="title">{{ $doc['title'] }}</div>
    @if ($doc['show_generated_at'])
        <div class="subtitle">Document généré le {{ $generatedAt }} · {{ $count }} article(s)</div>
    @endif

    @if ($doc['show_filters'])
        <table class="meta">
            <tr>
                <td><strong>Recherche :</strong> {{ $search !== '' ? $search : 'Toutes les valeurs' }}</td>
                <td style="text-align: right"><strong>Service recherché :</strong> {{ $service ? $service->code.' — '.$service->name : ($serviceCode ?: 'Tous les services') }}</td>
            </tr>
        </table>
    @endif

    @forelse ($groups as $group)
        @if ($doc['group_by_service'])
            <div class="group-heading">
                Service {{ $group['code'] ?: '—' }} — {{ $group['name'] }}
                <small>({{ $group['rows']->count() }} article(s))</small>
            </div>
        @endif
        <table class="data">
            <thead><tr>
                @foreach ($columns as $column)
                    <th style="width: {{ $column['width'] }}%">{{ $column['label'] }}</th>
                @endforeach
            </tr></thead>
            <tbody>
            @foreach ($group['rows'] as $index => $row)
                <tr @class(['zebra' => $page['zebra'] && $index % 2 === 1])>
                    @foreach ($columns as $column)
                        <td @class(['numeric' => $column['numeric'], 'centered' => $column['centered']])>{{ FicheInventairePdf::value($row['article'], $column['key'], $row['service']) }}</td>
                    @endforeach
                </tr>
            @endforeach
            @if ($showTotals)
                <tr class="total">
                    @foreach ($columns as $column)
                        <td @class(['numeric' => $column['numeric']])>
                            @if (in_array($column['key'], $totalKeys, true))
                                {{ $formatTotal($column['key'], $group['totals'][$column['key']]) }}
                            @elseif ($loop->first)
                                Total{{ $doc['group_by_service'] ? ' service' : '' }}
                            @endif
                        </td>
                    @endforeach
                </tr>
            @endif
            </tbody>
        </table>
    @empty
        <p style="text-align:center">Aucun article correspondant aux filtres.</p>
    @endforelse

    @if ($showTotals && $doc['group_by_service'] && $groups->count() > 1)
        <div class="grand-total">
            Total général :
            {{ collect($columns)->whereIn('key', $totalKeys)->map(fn ($column) => $column['label'].' '.$formatTotal($column['key'], $grandTotals[$column['key']]))->implode(' · ') }}
        </div>
    @endif

    @if ($settings['signatures']['enabled'] && $signatures)
        <table class="signatures">
            <tr>
                @foreach ($signatures as $label)
                    <td style="width: {{ round(100 / count($signatures), 2) }}%">{{ $label }}<div class="space"></div></td>
                @endforeach
            </tr>
        </table>
    @endif

    {{-- Page numbers are drawn by FicheInventairePdf once the page count is known. --}}
    <div class="footer">{{ $settings['footer']['text'] }}</div>
</body>
</html>
