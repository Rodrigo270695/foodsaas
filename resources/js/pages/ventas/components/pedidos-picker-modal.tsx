import { ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/data-page';
import { FormModal } from '@/components/forms/form-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { money, type PedidoPendiente } from './types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pedidos: PedidoPendiente[];
    pedidoActivoId: string | null;
    onSelect: (pedido: PedidoPendiente) => void;
};

export function PedidosPickerModal({
    open,
    onOpenChange,
    pedidos,
    pedidoActivoId,
    onSelect,
}: Props) {
    const { t } = useTranslation(['ventas', 'common']);

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('nueva.modal_pedidos_title')}
            description={t('nueva.modal_pedidos_description')}
            size="lg"
            blockDismiss={false}
            footer={
                <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => onOpenChange(false)}
                >
                    {t('common:actions.cancel', {
                        defaultValue: 'Cancelar',
                    })}
                </Button>
            }
        >
            {pedidos.length === 0 ? (
                <EmptyState
                    icon={ShoppingCart}
                    title={t('nueva.modal_pedidos_empty')}
                    description={t('empty.pendientes_hint')}
                />
            ) : (
                <ul className="space-y-2">
                    {pedidos.map((p) => {
                        const mesa =
                            p.mesa?.nombre?.trim() || p.mesa?.codigo || '—';
                        const mesero =
                            p.openedBy?.name ?? p.opened_by?.name ?? '—';
                        const selected = pedidoActivoId === p.id;

                        return (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(p)}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40',
                                        selected
                                            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40'
                                            : 'bg-background hover:border-brand-400/40 hover:bg-muted/30',
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-brand-800 tabular-nums dark:text-brand-100">
                                            #{p.numero}
                                            <span className="ml-2 font-normal text-muted-foreground">
                                                {mesa}
                                            </span>
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {mesero} ·{' '}
                                            {t('nueva.modal_pedidos_items', {
                                                count: p.lineas?.length ?? 0,
                                            })}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-semibold tabular-nums">
                                            {money(Number(p.total))}
                                        </p>
                                        <p className="text-[11px] text-brand-700">
                                            {t('nueva.modal_pedidos_usar')}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </FormModal>
    );
}
