<?php

namespace App\Exports;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

final class ReportesOperacionXlsxExport
{
    /**
     * @param  array{monto_total: float, ventas_count: int, ticket_promedio: float, anuladas: int}  $stats
     * @param  list<array{medio: string, monto: float, count: int}>  $medios
     * @param  list<array{tipo: string, count: int, monto: float}>  $porComprobante
     * @param  list<array{nombre: string, cantidad: float, importe: float}>  $topProductos
     * @param  array{
     *     costo_teorico: float,
     *     ventas_monto: float,
     *     porcentaje: float|null,
     *     top_insumos: list<array{nombre: string, unidad: string|null, cantidad: float, costo: float}>
     * }|null  $foodcost
     */
    public function __construct(
        private readonly array $stats,
        private readonly array $medios,
        private readonly array $porComprobante,
        private readonly array $topProductos,
        private readonly string $desde,
        private readonly string $hasta,
        private readonly ?array $foodcost = null,
    ) {}

    public function writeToPhpOutput(): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Resumen');

        $sheet->fromArray([
            ['Reporte operativo', $this->desde.' — '.$this->hasta],
            [],
            ['Métrica', 'Valor'],
            ['Monto total', $this->stats['monto_total']],
            ['Ventas', $this->stats['ventas_count']],
            ['Ticket promedio', $this->stats['ticket_promedio']],
            ['Anuladas', $this->stats['anuladas']],
        ], null, 'A1');

        $sheet->getStyle('A3:B3')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '660033'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $row = 10;
        $sheet->fromArray([['Medio', 'Monto', 'Cantidad']], null, "A{$row}");
        $sheet->getStyle("A{$row}:C{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '660033'],
            ],
        ]);
        $row++;
        foreach ($this->medios as $medio) {
            $sheet->fromArray([[$medio['medio'], $medio['monto'], $medio['count']]], null, "A{$row}");
            $row++;
        }

        $row += 2;
        $sheet->fromArray([['Comprobante', 'Cantidad', 'Monto']], null, "A{$row}");
        $sheet->getStyle("A{$row}:C{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '660033'],
            ],
        ]);
        $row++;
        foreach ($this->porComprobante as $item) {
            $sheet->fromArray([[$item['tipo'], $item['count'], $item['monto']]], null, "A{$row}");
            $row++;
        }

        $row += 2;
        $sheet->fromArray([['Producto', 'Cantidad', 'Importe']], null, "A{$row}");
        $sheet->getStyle("A{$row}:C{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '660033'],
            ],
        ]);
        $row++;
        foreach ($this->topProductos as $item) {
            $sheet->fromArray([[$item['nombre'], $item['cantidad'], $item['importe']]], null, "A{$row}");
            $row++;
        }

        if ($this->foodcost !== null) {
            $row += 2;
            $sheet->fromArray([['Foodcost']], null, "A{$row}");
            $sheet->getStyle("A{$row}")->getFont()->setBold(true);
            $row++;
            $sheet->fromArray([
                ['Costo teórico', $this->foodcost['costo_teorico']],
                ['Ventas', $this->foodcost['ventas_monto']],
                ['% foodcost', $this->foodcost['porcentaje']],
            ], null, "A{$row}");
            $row += 4;
            $sheet->fromArray([['Insumo', 'Cantidad', 'Costo']], null, "A{$row}");
            $sheet->getStyle("A{$row}:C{$row}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '660033'],
                ],
            ]);
            $row++;
            foreach ($this->foodcost['top_insumos'] as $item) {
                $label = $item['unidad']
                    ? $item['nombre'].' ('.$item['unidad'].')'
                    : $item['nombre'];
                $sheet->fromArray([[$label, $item['cantidad'], $item['costo']]], null, "A{$row}");
                $row++;
            }
        }

        foreach (range('A', 'C') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        $spreadsheet->disconnectWorksheets();
    }
}
