import { cn } from '@/lib/utils';
import type { ProductoCarta } from '../types';
import { ProductoCard } from './producto-card';

type ProductosGridProps = {
    productos: ProductoCarta[];
    isLoading?: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    ariaLabel: string;
    formatPrice: (value: string) => string;
    onEdit: (producto: ProductoCarta) => void;
    onDelete: (producto: ProductoCarta) => void;
};

export function ProductosGrid({
    productos,
    isLoading = false,
    canUpdate,
    canDelete,
    ariaLabel,
    formatPrice,
    onEdit,
    onDelete,
}: ProductosGridProps) {
    return (
        <div
            className={cn(
                'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                isLoading && 'pointer-events-none opacity-60',
            )}
            role="status"
            aria-live="polite"
            aria-label={ariaLabel}
        >
            {productos.map((producto, index) => (
                <div
                    key={producto.id}
                    className="animate-in fade-in zoom-in-95 fill-mode-both duration-300"
                    style={{
                        animationDelay: `${Math.min(index, 12) * 40}ms`,
                    }}
                >
                    <ProductoCard
                        producto={producto}
                        priceLabel={formatPrice(producto.precio)}
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
