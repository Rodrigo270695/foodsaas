<?php

namespace App\Exports;

use App\Models\Venta;
use Illuminate\Database\Eloquent\Builder;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Table;
use PhpOffice\PhpSpreadsheet\Worksheet\Table\TableStyle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Export XLSX del historial de ventas (misma familia visual que Almacén / Carta).
 */
class VentasXlsxExport
{
    /**
     * @var array<int, array{label: string, value: \Closure(Venta): mixed}>
     */
    private array $columns;

    public function __construct()
    {
        $this->columns = [
            [
                'label' => 'Número',
                'value' => fn (Venta $v) => (string) ($v->numero ?? ''),
            ],
            [
                'label' => 'Fecha',
                'value' => fn (Venta $v) => optional($v->created_at)->format('Y-m-d H:i') ?? '',
            ],
            [
                'label' => 'Cliente',
                'value' => fn (Venta $v) => (string) ($v->cliente_nombre ?: 'Varios'),
            ],
            [
                'label' => 'Documento',
                'value' => fn (Venta $v) => (string) ($v->cliente_documento ?? ''),
            ],
            [
                'label' => 'Origen',
                'value' => fn (Venta $v) => (string) ($v->origen ?? ''),
            ],
            [
                'label' => 'Comprobante',
                'value' => fn (Venta $v) => (string) ($v->tipo_comprobante ?? ''),
            ],
            [
                'label' => 'Pedido',
                'value' => fn (Venta $v) => $v->pedido !== null ? '#'.$v->pedido->numero : '',
            ],
            [
                'label' => 'Mesa',
                'value' => function (Venta $v): string {
                    $mesa = $v->pedido?->mesa;
                    if ($mesa === null) {
                        return '';
                    }

                    return (string) ($mesa->nombre ?: $mesa->codigo);
                },
            ],
            [
                'label' => 'Sede',
                'value' => fn (Venta $v) => (string) ($v->sede?->nombre ?? ''),
            ],
            [
                'label' => 'Código sede',
                'value' => fn (Venta $v) => (string) ($v->sede?->codigo ?? ''),
            ],
            [
                'label' => 'Subtotal',
                'value' => fn (Venta $v) => (string) $v->subtotal,
            ],
            [
                'label' => 'Descuento',
                'value' => fn (Venta $v) => (string) $v->descuento,
            ],
            [
                'label' => 'Total',
                'value' => fn (Venta $v) => (string) $v->total,
            ],
            [
                'label' => 'Métodos pago',
                'value' => function (Venta $v): string {
                    return $v->pagos
                        ->map(fn ($p) => $p->medio.': '.$p->monto)
                        ->implode(' | ');
                },
            ],
            [
                'label' => 'Estado',
                'value' => fn (Venta $v) => (string) ($v->estado ?? ''),
            ],
            [
                'label' => 'Cajero',
                'value' => fn (Venta $v) => (string) ($v->createdBy?->name ?? ''),
            ],
        ];
    }

    /**
     * @param  Builder<Venta>  $query
     */
    public function streamTo(Builder $query, string $output = 'php://output'): void
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('FoodSaaS')
            ->setTitle('Ventas')
            ->setSubject('Ventas por filtros');

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Ventas');

        $columnCount = count($this->columns);
        $lastColumnLetter = Coordinate::stringFromColumnIndex($columnCount);

        $sheet->setCellValue('A1', 'Ventas');
        $sheet->mergeCells("A1:{$lastColumnLetter}1");
        $sheet->getStyle('A1')->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 16,
                'color' => ['rgb' => '660033'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(26);

        $sheet->setCellValue(
            'A2',
            sprintf(
                'Exportado el %s · %d registros',
                now()->format('d/m/Y H:i'),
                $query->toBase()->getCountForPagination(),
            ),
        );
        $sheet->mergeCells("A2:{$lastColumnLetter}2");
        $sheet->getStyle('A2')->applyFromArray([
            'font' => [
                'italic' => true,
                'size' => 10,
                'color' => ['rgb' => '6B7280'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $headerRow = 4;
        $dataStartRow = $headerRow + 1;

        foreach ($this->columns as $index => $col) {
            $colLetter = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$colLetter}{$headerRow}", $col['label']);
        }

        $row = $dataStartRow;
        /** @var Venta $venta */
        foreach ($query->cursor() as $venta) {
            foreach ($this->columns as $index => $col) {
                $colLetter = Coordinate::stringFromColumnIndex($index + 1);
                $value = ($col['value'])($venta);
                $sheet->setCellValueExplicit(
                    "{$colLetter}{$row}",
                    $value,
                    \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING,
                );
            }
            $row++;
        }

        $lastDataRow = max($dataStartRow, $row - 1);

        $this->styleTable($sheet, $lastColumnLetter, $headerRow, $lastDataRow);

        $sheet->freezePane('A'.($headerRow + 1));

        foreach (range('A', $lastColumnLetter) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($output);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
    }

    private function styleTable(
        Worksheet $sheet,
        string $lastColumn,
        int $headerRow,
        int $lastDataRow,
    ): void {
        $headerRange = "A{$headerRow}:{$lastColumn}{$headerRow}";
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '660033'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '4A0024'],
                ],
            ],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(28);

        if ($lastDataRow >= $headerRow + 1) {
            $dataRange = 'A'.($headerRow + 1).":{$lastColumn}{$lastDataRow}";
            $sheet->getStyle($dataRange)->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E5E7EB'],
                    ],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => false,
                ],
            ]);
        }

        $tableRange = "A{$headerRow}:{$lastColumn}".max($headerRow + 1, $lastDataRow);
        $table = new Table($tableRange, 'TablaVentas');
        $table->setStyle(new TableStyle(TableStyle::TABLE_STYLE_MEDIUM2));
        $sheet->addTable($table);
    }
}
