<?php

namespace App\Exports;

use App\Models\MovimientoInventario;
use App\Models\ProductoCarta;
use Illuminate\Database\Eloquent\Builder;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AlmacenKardexXlsxExport
{
    public function __construct(private readonly ProductoCarta $producto) {}

    /**
     * @param  Builder<MovimientoInventario>  $query
     */
    public function streamTo(Builder $query): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Kardex');

        $sheet->setCellValue('A1', 'Kardex: '.$this->producto->nombre);
        $sheet->mergeCells('A1:G1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $headers = ['Fecha', 'Tipo', 'Cantidad', 'Stock anterior', 'Stock después', 'Motivo', 'Usuario'];
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
                $sheet->setCellValue("B{$row}", $mov->tipo);
                $sheet->setCellValue("C{$row}", (float) $mov->cantidad);
                $sheet->setCellValue("D{$row}", (float) $mov->stock_anterior);
                $sheet->setCellValue("E{$row}", (float) $mov->stock_despues);
                $sheet->setCellValue("F{$row}", (string) ($mov->motivo ?? ''));
                $sheet->setCellValue("G{$row}", (string) ($mov->user?->name ?? ''));
                $row++;
            }
        });

        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        $spreadsheet->disconnectWorksheets();
    }
}
