<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>{{ $carta->nombre }}</title>
    <style>
        @page { margin: 28px 32px; }
        body { font-family: DejaVu Sans, sans-serif; color: #1c1917; font-size: 11px; }
        .header { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #660033; padding-bottom: 12px; }
        .logo { max-height: 48px; margin-bottom: 8px; }
        h1 { font-size: 20px; margin: 0; color: #660033; }
        .desc { color: #57534e; margin-top: 4px; font-size: 10px; }
        .page-title { font-size: 13px; color: #660033; margin: 16px 0 8px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 6px 4px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
        .precio { text-align: right; white-space: nowrap; font-weight: bold; }
        .cat { font-size: 9px; color: #78716c; text-transform: uppercase; letter-spacing: .04em; }
        .wm { position: fixed; bottom: 12px; right: 24px; opacity: .18; font-size: 10px; color: #660033; }
    </style>
</head>
<body>
    <div class="header">
        @if (!empty($logo_url))
            <img class="logo" src="{{ $logo_url }}" alt="Logo">
        @endif
        <h1>{{ $carta->nombre }}</h1>
        @if ($carta->descripcion)
            <div class="desc">{{ $carta->descripcion }}</div>
        @endif
    </div>

    @foreach ($pages as $pagina => $items)
        <div class="page-title">Página {{ $pagina }}</div>
        <table>
            @foreach ($items as $item)
                @php $p = $item->producto; @endphp
                @if ($p)
                    <tr>
                        <td>
                            <div class="cat">{{ $p->categoria?->nombre }}</div>
                            <strong>{{ $p->nombre }}</strong>
                            @if ($p->descripcion)
                                <div class="desc">{{ $p->descripcion }}</div>
                            @endif
                        </td>
                        <td class="precio">S/ {{ number_format((float) $p->precio, 2) }}</td>
                    </tr>
                @endif
            @endforeach
        </table>
    @endforeach

    <div class="wm">FoodSaaS · {{ $carta->nombre }}</div>
</body>
</html>
