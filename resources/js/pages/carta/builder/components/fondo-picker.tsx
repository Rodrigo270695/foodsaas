import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FONDOS } from '../lib/fondos';
import type { FondoPreset } from '../types';

type FondoPickerProps = {
    value: FondoPreset;
    onChange: (value: FondoPreset) => void;
    customImageUrl?: string | null;
    /** Archivo pendiente de subir (preview local). */
    pendingFile?: File | null;
    onPickCustom?: (file: File) => void;
    onClearCustom?: () => void;
};

export function FondoPicker({
    value,
    onChange,
    customImageUrl = null,
    pendingFile = null,
    onPickCustom,
    onClearCustom,
}: FondoPickerProps) {
    const { t } = useTranslation('carta');
    const inputRef = useRef<HTMLInputElement>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!pendingFile) {
            setObjectUrl(null);
            return;
        }
        const url = URL.createObjectURL(pendingFile);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [pendingFile]);

    const previewUrl = objectUrl ?? customImageUrl;

    return (
        <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
                {t('builder.fondo_label')}
            </p>
            <div className="grid grid-cols-5 gap-2">
                {FONDOS.map((fondo) => {
                    const selected = value === fondo.id && !previewUrl;

                    return (
                        <button
                            key={fondo.id}
                            type="button"
                            title={t(fondo.labelKey)}
                            aria-label={t(fondo.labelKey)}
                            aria-pressed={selected}
                            onClick={() => onChange(fondo.id)}
                            className={cn(
                                'h-10 cursor-pointer rounded-lg border-2 transition-all duration-300',
                                fondo.canvasClass,
                                selected
                                    ? 'scale-105 border-brand-600 shadow-md ring-2 ring-brand-600/30'
                                    : 'border-border/50 opacity-80 hover:scale-[1.03] hover:opacity-100',
                            )}
                        />
                    );
                })}
            </div>

            {onPickCustom ? (
                <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">
                        {t('builder.fondo_custom_hint', {
                            defaultValue:
                                'O sube una imagen propia (JPG/PNG/WebP, máx. 4 MB).',
                        })}
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    onPickCustom(file);
                                }
                                e.target.value = '';
                            }}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer gap-1.5"
                            onClick={() => inputRef.current?.click()}
                        >
                            <ImagePlus className="size-3.5" />
                            {t('builder.fondo_custom', {
                                defaultValue: 'Imagen',
                            })}
                        </Button>
                        {previewUrl && onClearCustom ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer gap-1.5 text-destructive"
                                onClick={onClearCustom}
                            >
                                <Trash2 className="size-3.5" />
                                {t('common:actions.remove', {
                                    defaultValue: 'Quitar',
                                })}
                            </Button>
                        ) : null}
                    </div>
                    {previewUrl ? (
                        <div
                            className="h-16 overflow-hidden rounded-lg border border-brand-600/40 bg-muted bg-cover bg-center ring-2 ring-brand-600/20"
                            style={{ backgroundImage: `url(${previewUrl})` }}
                            title={t('builder.fondo_custom_active', {
                                defaultValue: 'Fondo personalizado activo',
                            })}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
