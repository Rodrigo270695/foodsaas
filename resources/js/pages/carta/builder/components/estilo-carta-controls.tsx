import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TIPOGRAFIAS, type TipografiaId } from '../lib/tipografias';

type EstiloCartaControlsProps = {
    tipografia: string;
    colorTexto: string;
    onTipografiaChange: (value: TipografiaId) => void;
    onColorTextoChange: (value: string) => void;
};

export function EstiloCartaControls({
    tipografia,
    colorTexto,
    onTipografiaChange,
    onColorTextoChange,
}: EstiloCartaControlsProps) {
    const { t } = useTranslation('carta');

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                    {t('builder.tipografia_label', {
                        defaultValue: 'Tipografía',
                    })}
                </p>
                <Select
                    value={tipografia}
                    onValueChange={(v) => onTipografiaChange(v as TipografiaId)}
                >
                    <SelectTrigger className="h-9 w-full cursor-pointer">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                        {TIPOGRAFIAS.map((font) => (
                            <SelectItem
                                key={font.id}
                                value={font.id}
                                className="cursor-pointer"
                                style={{ fontFamily: font.family }}
                            >
                                {font.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                    {t('builder.color_texto_label', {
                        defaultValue: 'Color de texto',
                    })}
                </p>
                <div className="flex items-center gap-2">
                    <Input
                        type="color"
                        value={colorTexto || '#2C1810'}
                        onChange={(e) => onColorTextoChange(e.target.value)}
                        className="h-9 w-12 cursor-pointer p-1"
                        aria-label={t('builder.color_texto_label', {
                            defaultValue: 'Color de texto',
                        })}
                    />
                    <Input
                        type="text"
                        value={colorTexto}
                        onChange={(e) => onColorTextoChange(e.target.value)}
                        placeholder="#2C1810"
                        maxLength={7}
                        className="h-9 flex-1 font-mono text-xs"
                    />
                    {colorTexto ? (
                        <button
                            type="button"
                            className="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                            onClick={() => onColorTextoChange('')}
                        >
                            {t('builder.color_texto_reset', {
                                defaultValue: 'Auto',
                            })}
                        </button>
                    ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                    {t('builder.color_texto_hint', {
                        defaultValue:
                            'Aplica a títulos y textos. «Auto» usa el color del fondo.',
                    })}
                </p>
            </div>
        </div>
    );
}
