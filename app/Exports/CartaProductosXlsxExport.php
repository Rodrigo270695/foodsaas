<?php

namespace App\Exports;

use App\Models\ProductoCarta;
use Illuminate\Database\Eloquent\Builder;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class CartaProductosXlsxExport
{
    /**
     * @param  Builder<ProductoCarta>  $query
     */
    public function streamTo(Builder $query): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Carta');

        $headers = [
            'Producto',
            'Código',
            'Categoría',
            'Área',
            'Precio',
            'Control inventario',
            'Stock',
            'Stock mínimo',
            'Estado',
        ];
        foreach ($headers as $i => $label) {
            $col = chr(65 + $i);
            $sheet->setCellValue("{$col}1", $label);
            $sheet->getStyle("{$col}1")->getFont()->setBold(true);
            $sheet->getStyle("{$col}1")->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB('660033');
            $sheet->getStyle("{$col}1")->getFont()->getColor()->setRGB('FFFFFF');
            $sheet->getStyle("{$col}1")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        $controlLabels = [
            ProductoCarta::CONTROL_NONE => 'Sin control',
            ProductoCarta::CONTROL_SKU => 'SKU',
            ProductoCarta::CONTROL_RECIPE => 'Receta',
        ];

        $row = 2;
        $query->chunk(200, function ($productos) use ($sheet, &$row, $controlLabels): void {
            foreach ($productos as $producto) {
                /** @var ProductoCarta $producto */
                $sheet->setCellValue("A{$row}", $producto->nombre);
                $sheet->setCellValue("B{$row}", (string) ($producto->codigo ?? ''));
                $sheet->setCellValue("C{$row}", (string) ($producto->categoria?->nombre ?? ''));
                $sheet->setCellValue("D{$row}", (string) ($producto->area?->nombre ?? ''));
                $sheet->setCellValue("E{$row}", (float) $producto->precio);
                $sheet->setCellValue(
                    "F{$row}",
                    $controlLabels[$producto->control_inventario] ?? $producto->control_inventario,
                );
                $sheet->setCellValue(
                    "G{$row}",
                    $producto->control_inventario === ProductoCarta::CONTROL_SKU
                        ? (float) ($producto->stock ?? 0)
                        : '',
                );
                $sheet->setCellValue(
                    "H{$row}",
                    $producto->stock_minimo !== null ? (float) $producto->stock_minimo : '',
                );
                $sheet->setCellValue("I{$row}", $producto->activo ? 'Activo' : 'Inactivo');
                $row++;
            }
        });

        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        $spreadsheet->disconnectWorksheets();
    }
}
