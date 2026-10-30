import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FONDOS } from '../lib/fondos';
import type { FondoPreset } from '../types';

type FondoPickerProps = {
    value: FondoPreset;
    onChange: (value: FondoPreset) => void;
};

export function FondoPicker({ value, onChange }: FondoPickerProps) {
    const { t } = useTranslation('carta');

    return (
        <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
                {t('builder.fondo_label')}
            </p>
            <div className="grid grid-cols-5 gap-2">
                {FONDOS.map((fondo) => {
                    const selected = value === fondo.id;

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
                                    : 'border-border/50 opacity-80 hover:opacity-100 hover:scale-[1.03]',
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
}
