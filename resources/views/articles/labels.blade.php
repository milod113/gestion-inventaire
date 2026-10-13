@php
    $thermal = $format['key'] === 'thermique';
    $padding = $thermal ? 1.5 : 2.5;
    $innerHeight = $format['height'] - 2 * $padding;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Étiquettes articles</title>
    <style>
        @page { margin: {{ $thermal ? '0' : '0.5mm 0' }}; }
        body { margin: 0; color: #111; font-family: DejaVu Sans, sans-serif; }
        .sheet { border-collapse: collapse; table-layout: fixed; page-break-after: always; }
        .sheet:last-child { page-break-after: auto; }
        .sheet td { width: {{ $format['width'] }}mm; height: {{ $format['height'] }}mm; padding: 0; vertical-align: top; }
        .label { height: {{ $innerHeight }}mm; padding: {{ $padding }}mm; overflow: hidden; }
        .head { width: 100%; border-collapse: collapse; font-size: {{ $thermal ? 5 : 6 }}pt; color: #444; }
        .head td { width: auto; height: auto; padding: 0; }
        .description { margin-top: 0.6mm; height: {{ $thermal ? 2.6 : 5.6 }}mm; overflow: hidden; font-size: {{ $thermal ? 6 : 7 }}pt; font-weight: bold; line-height: 1.2; }
        .barcode { margin-top: 1mm; width: 100%; height: {{ $thermal ? 10 : 13 }}mm; }
        .code { text-align: center; font-size: {{ $thermal ? 7 : 9 }}pt; font-weight: bold; letter-spacing: 0.3pt; }
    </style>
</head>
<body>
@foreach ($pages as $page)
    <table class="sheet">
        @foreach ($page->values()->chunk($format['columns']) as $row)
            <tr>
                @foreach ($row as $label)
                    <td>
                        @if ($label)
                            <div class="label">
                                <table class="head"><tr>
                                    <td>CHU Damerdji Tidjani</td>
                                    <td style="text-align: right">{{ $label['service'] ? 'Service '.$label['service'] : '' }}</td>
                                </tr></table>
                                <div class="description">{{ \Illuminate\Support\Str::limit($label['description'], $thermal ? 32 : 70) }}</div>
                                <img class="barcode" src="{{ $label['barcode'] }}" alt="{{ $label['code'] }}">
                                <div class="code">{{ $label['code'] }}</div>
                            </div>
                        @endif
                    </td>
                @endforeach
                @for ($i = $row->count(); $i < $format['columns']; $i++)
                    <td></td>
                @endfor
            </tr>
        @endforeach
    </table>
@endforeach
</body>
</html>
