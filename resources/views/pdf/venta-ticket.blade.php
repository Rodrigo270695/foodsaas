<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Ticket {{ $venta->numero ?? $venta->id }}</title>
    <style>
        @page { margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
            width: 100%;
            font-family: 'DejaVu Sans', DejaVu Sans, sans-serif;
            font-size: {{ $tf['fs'] }}px;
            line-height: 1.3;
            color: #000;
            font-weight: bold;
        }
        .pad { padding: 2.5mm {{ $tf['pad_x'] }} 4mm; }
        .center { text-align: center; }
        .logo {
            display: block;
            margin: 0 auto 4px;
            max-width: 72%;
            max-height: {{ $tf['logo_max'] }}mm;
            width: auto;
            height: auto;
        }
        .title {
            font-weight: bold;
            font-size: {{ $tf['fs_title'] }}px;
            margin: 0 0 2px;
            line-height: 1.2;
        }
        .muted {
            font-size: {{ $tf['fs_sm'] }}px;
            margin: 0 0 1px;
            font-weight: bold;
        }
        .doc-label {
            font-weight: bold;
            font-size: {{ $tf['fs_sm'] }}px;
            margin: 4px 0 2px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }
        .badge {
            display: inline-block;
            border: 1.8px solid #000;
            font-weight: bold;
            font-size: {{ $tf['fs'] }}px;
            padding: 2px 8px;
            margin: 2px 0 4px;
            letter-spacing: 0.6px;
        }
        .rule {
            border: 0;
            border-top: 1px dashed #000;
            margin: 5px 0;
        }
        .sec {
            font-weight: bold;
            font-size: {{ $tf['fs_sm'] }}px;
            text-transform: uppercase;
            margin: 5px 0 2px;
            letter-spacing: 0.4px;
        }
        table.rows {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        table.rows td {
            padding: 1.5px 0;
            vertical-align: top;
            font-size: {{ $tf['fs'] }}px;
            line-height: 1.3;
            font-weight: bold;
        }
        table.rows .lbl {
            width: 44%;
            font-weight: bold;
        }
        table.rows .val {
            width: 56%;
            text-align: right;
            font-weight: bold;
            font-variant-numeric: tabular-nums;
        }
        table.items {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-top: 2px;
        }
        table.items th {
            font-size: {{ $tf['fs_sm'] }}px;
            font-weight: bold;
            text-align: left;
            padding: 2px 0;
            border-bottom: 1.5px solid #000;
        }
        table.items th.r { text-align: right; }
        table.items td {
            font-size: {{ $tf['fs'] }}px;
            font-weight: bold;
            padding: 2px 0;
            vertical-align: top;
        }
        table.items td.r {
            text-align: right;
            font-weight: bold;
            font-variant-numeric: tabular-nums;
        }
        table.items .qty {
            width: 18%;
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
        table.items .name { width: 54%; }
        table.items .amt { width: 28%; }
        .total-line td {
            font-weight: bold;
            font-size: {{ $tf['fs_total'] }}px;
            padding-top: 4px;
            border-top: 1.8px solid #000;
        }
        .footer {
            margin-top: 8px;
            font-size: {{ $tf['footer'] }}px;
            text-align: center;
            font-weight: bold;
        }
    </style>
</head>
<body>
@php
    $fmt = static function (string $n, string $moneda): string {
        return $moneda.' '.$n;
    };
    $medioLabel = static function (string $codigo): string {
        return match ($codigo) {
            'efectivo' => 'Efectivo',
            'tarjeta' => 'Tarjeta',
            'yape' => 'Yape',
            'plin' => 'Plin',
            'transferencia' => 'Transferencia',
            'agora' => 'Agora',
            'sip' => 'Sip',
            default => ucfirst($codigo),
        };
    };
    $fecha = optional($venta->created_at)->timezone(config('app.timezone', 'America/Lima'))->format('d/m/Y H:i');
    $primerMedio = isset($pagos[0]['medio']) ? $medioLabel((string) $pagos[0]['medio']) : '—';
@endphp

<div class="pad">
    <div class="center">
        @if($logoDataUri !== '')
            <img src="{{ $logoDataUri }}" class="logo" alt="Logo">
        @endif
        <p class="title">{{ $clinic_nombre }}</p>
        @if(!empty($clinic_ruc))
            <p class="muted">RUC {{ $clinic_ruc }}</p>
        @endif
        @if(!empty($clinic_direccion))
            <p class="muted">{{ $clinic_direccion }}</p>
        @endif
        @if(!empty($clinic_telefono))
            <p class="muted">Tel {{ $clinic_telefono }}</p>
        @endif
    </div>

    <hr class="rule">

    <div class="center">
        <p class="doc-label">Comprobante de cobro en caja</p>
        @if(($venta->estado ?? '') === 'pagada')
            <div class="badge">PAGADO</div>
        @elseif(($venta->estado ?? '') === 'anulada')
            <div class="badge">ANULADO</div>
        @endif
    </div>

    <p class="sec">Venta</p>
    <table class="rows">
        <tr>
            <td class="lbl">N.º venta</td>
            <td class="val">{{ $venta->numero ?? '—' }}</td>
        </tr>
        <tr>
            <td class="lbl">Fecha de cobro</td>
            <td class="val">{{ $fecha ?? '—' }}</td>
        </tr>
        <tr>
            <td class="lbl">Sede</td>
            <td class="val">{{ $venta->sede?->nombre ?? '—' }}</td>
        </tr>
    </table>

    <p class="sec">Cliente</p>
    <table class="rows">
        <tr>
            <td class="lbl">Cliente</td>
            <td class="val">{{ $venta->cliente_nombre ?: 'Varios' }}</td>
        </tr>
        @if(!empty($venta->cliente_documento))
            <tr>
                <td class="lbl">Documento</td>
                <td class="val">{{ $venta->cliente_documento }}</td>
            </tr>
        @endif
        <tr>
            <td class="lbl">Cajero</td>
            <td class="val">{{ $venta->createdBy?->name ?? '—' }}</td>
        </tr>
    </table>

    <hr class="rule">

    <table class="items">
        <thead>
            <tr>
                <th class="name">Producto</th>
                <th class="qty r">Cant.</th>
                <th class="amt r">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @forelse($lineas as $linea)
                <tr>
                    <td class="name">{{ $linea['nombre'] }}</td>
                    <td class="qty r">{{ $linea['cantidad'] }}</td>
                    <td class="amt r">{{ $linea['importe'] }}</td>
                </tr>
            @empty
                <tr>
                    <td class="name" colspan="3">Venta registrada</td>
                </tr>
            @endempty
        </tbody>
    </table>

    <hr class="rule">

    <table class="rows">
        <tr>
            <td class="lbl">Subtotal (sin IGV)</td>
            <td class="val">{{ $fmt($subtotal_sin_igv, $moneda) }}</td>
        </tr>
        <tr>
            <td class="lbl">IGV ({{ number_format((float) $igv_porcentaje, 2) }}%)</td>
            <td class="val">{{ $fmt($igv_monto, $moneda) }}</td>
        </tr>
        @if((float) $descuento > 0)
            <tr>
                <td class="lbl">Descuento</td>
                <td class="val">−{{ $fmt($descuento, $moneda) }}</td>
            </tr>
        @endif
        <tr class="total-line">
            <td class="lbl">TOTAL</td>
            <td class="val">{{ $fmt($total, $moneda) }}</td>
        </tr>
    </table>

    <p class="sec">Pago</p>
    <table class="rows">
        <tr>
            <td class="lbl">Método de pago</td>
            <td class="val">{{ $primerMedio }}</td>
        </tr>
        @if(count($pagos) > 1)
            @foreach($pagos as $pago)
                <tr>
                    <td class="lbl">{{ $medioLabel($pago['medio']) }}</td>
                    <td class="val">{{ $fmt($pago['monto'], $moneda) }}</td>
                </tr>
            @endforeach
        @endif
        <tr>
            <td class="lbl">Monto recibido</td>
            <td class="val">{{ $fmt($monto_recibido, $moneda) }}</td>
        </tr>
        <tr>
            <td class="lbl">Vuelto</td>
            <td class="val">{{ $fmt($vuelto, $moneda) }}</td>
        </tr>
    </table>

    <p class="footer">
        Documento interno de cobro · no es CPE SUNAT<br>
        Ancho {{ $ancho_mm }} mm
    </p>
</div>
</body>
</html>
