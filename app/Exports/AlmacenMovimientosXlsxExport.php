<?php

namespace App\Exports;

use App\Models\MovimientoInventario;
use Illuminate\Database\Eloquent\Builder;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AlmacenMovimientosXlsxExport
{
    /**
     * @param  Builder<MovimientoInventario>  $query
     */
    public function streamTo(Builder $query): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Movimientos');

        $sheet->setCellValue('A1', 'Movimientos de almacén');
        $sheet->mergeCells('A1:I1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $headers = [
            'Fecha',
            'Producto',
            'Código',
            'Tipo',
            'Cantidad',
            'Stock anterior',
            'Stock después',
            'Motivo',
            'Usuario',
        ];
        foreach ($headers as $i => $label) {
            $col = chr(65 + $i);
            $sheet->setCellValue("{$col}3", $label);
            $sheet->getStyle("{$col}3")->getFont()->setBold(true);
            $sheet->getStyle("{$col}3")->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB('660033');
            $sheet->getStyle("{$col}3")->getFont()->getColor()->setRGB('FFFFFF');
            $sheet->getStyle("{$col}3")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        $row = 4;
        $query->chunk(200, function ($movimientos) use ($sheet, &$row): void {
            foreach ($movimientos as $mov) {
                /** @var MovimientoInventario $mov */
                $sheet->setCellValue("A{$row}", optional($mov->created_at)->format('Y-m-d H:i'));
                $sheet->setCellValue("B{$row}", (string) ($mov->producto?->nombre ?? ''));
                $sheet->setCellValue("C{$row}", (string) ($mov->producto?->codigo ?? ''));
                $sheet->setCellValue("D{$row}", $mov->tipo);
                $sheet->setCellValue("E{$row}", (float) $mov->cantidad);
                $sheet->setCellValue("F{$row}", (float) $mov->stock_anterior);
                $sheet->setCellValue("G{$row}", (float) $mov->stock_despues);
                $sheet->setCellValue("H{$row}", (string) ($mov->motivo ?? ''));
                $sheet->setCellValue("I{$row}", (string) ($mov->user?->name ?? ''));
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
