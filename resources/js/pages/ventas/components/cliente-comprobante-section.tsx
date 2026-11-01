import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type Props = {
    tipo: string;
    tiposComprobante: string[];
    clienteNombre: string;
    clienteDoc: string;
    onTipoChange: (tipo: string) => void;
    onClienteNombreChange: (value: string) => void;
    onClienteDocChange: (value: string) => void;
};

export function ClienteComprobanteSection({
    tipo,
    tiposComprobante,
    clienteNombre,
    clienteDoc,
    onTipoChange,
    onClienteNombreChange,
    onClienteDocChange,
}: Props) {
    const { t } = useTranslation('ventas');

    const hint =
        tipo === 'factura'
            ? t('nueva.cliente_hint_factura')
            : tipo === 'boleta'
              ? t('nueva.cliente_hint_boleta')
              : t('nueva.cliente_hint_ticket');

    return (
        <section className="rounded-xl border bg-card/70 p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="space-y-1.5">
                    <Label htmlFor="cliente" className="text-xs leading-none">
                        {t('nueva.cliente')}
                    </Label>
                    <Input
                        id="cliente"
                        value={clienteNombre}
                        placeholder={t('nueva.cliente_placeholder')}
                        onChange={(e) => onClienteNombreChange(e.target.value)}
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5 sm:w-[15rem]">
                    <Label className="text-xs leading-none">
                        {t('nueva.comprobante')}
                    </Label>
                    <ToggleGroup
                        type="single"
                        value={tipo}
                        onValueChange={(v) => {
                            if (v) {
                                onTipoChange(v);
                            }
                        }}
                        variant="outline"
                        size="sm"
                        className="grid h-9 w-full grid-cols-3"
                    >
                        {tiposComprobante.map((item) => (
                            <ToggleGroupItem
                                key={item}
                                value={item}
                                className="h-9 cursor-pointer px-2 text-xs capitalize data-[state=on]:bg-brand-50 data-[state=on]:text-brand-800 dark:data-[state=on]:bg-brand-950/50 dark:data-[state=on]:text-brand-100"
                            >
                                {t(`tipo.${item}`)}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground sm:col-span-2">
                    {hint}
                </p>
            </div>

            {tipo !== 'ticket' ? (
                <div className="mt-3 space-y-1.5">
                    <Label htmlFor="doc" className="text-xs">
                        {t('nueva.documento')}
                    </Label>
                    <Input
                        id="doc"
                        value={clienteDoc}
                        inputMode="numeric"
                        placeholder={
                            tipo === 'factura'
                                ? t('nueva.documento_placeholder_factura')
                                : t('nueva.documento_placeholder_boleta')
                        }
                        onChange={(e) =>
                            onClienteDocChange(
                                e.target.value.replace(/\D/g, '').slice(0, 11),
                            )
                        }
                        className="h-9 max-w-xs"
                    />
                </div>
            ) : null}
        </section>
    );
}
