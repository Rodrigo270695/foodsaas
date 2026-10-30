import { cn } from '@/lib/utils';
import type { MesaSalon } from '../types';
import { MesaFloorCard } from './mesa-floor-card';

type MesasGridProps = {
    mesas: MesaSalon[];
    isLoading?: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    ariaLabel: string;
    onEdit: (mesa: MesaSalon) => void;
    onDelete: (mesa: MesaSalon) => void;
};

export function MesasGrid({
    mesas,
    isLoading = false,
    canUpdate,
    canDelete,
    ariaLabel,
    onEdit,
    onDelete,
}: MesasGridProps) {
    return (
        <div
            className={cn(
                'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
                isLoading && 'pointer-events-none opacity-60',
            )}
            role="status"
            aria-live="polite"
            aria-label={ariaLabel}
        >
            {mesas.map((mesa, index) => (
                <div
                    key={mesa.id}
                    className="animate-in fade-in zoom-in-95 fill-mode-both duration-300"
                    style={{
                        animationDelay: `${Math.min(index, 12) * 40}ms`,
                    }}
                >
                    <MesaFloorCard
                        mesa={mesa}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                </div>
            ))}
        </div>
    );
}
