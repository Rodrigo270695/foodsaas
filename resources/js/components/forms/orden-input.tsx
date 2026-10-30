import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type OrdenValue = number | '';

export type OrdenInputProps = {
    id: string;
    value: OrdenValue;
    onChange: (value: OrdenValue) => void;
    /**
     * Si el campo queda vacío al blur (o al normalizar), se usa este valor.
     * Suele ser el siguiente orden sugerido (1, 2, 3…).
     */
    fallbackOnEmpty?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    className?: string;
    'aria-invalid'?: boolean;
};

/** Siguiente orden: max existente + 1, o 1 si no hay ítems. */
export function nextOrdenFrom(
    items: readonly { orden: number }[] | readonly number[],
): number {
    if (items.length === 0) {
        return 1;
    }

    const values = items.map((item) =>
        typeof item === 'number' ? item : item.orden,
    );

    return Math.max(0, ...values) + 1;
}

/** Convierte el valor del input a entero para enviar al backend. */
export function resolveOrdenValue(
    value: OrdenValue,
    fallback: number = 1,
): number {
    if (value === '' || value === null || Number.isNaN(Number(value))) {
        return fallback;
    }

    return Math.trunc(Number(value));
}

/**
 * Input numérico de orden que permite borrar el valor (campo vacío)
 * mientras se edita. Al salir del campo vacío, restaura `fallbackOnEmpty`.
 */
export function OrdenInput({
    id,
    value,
    onChange,
    fallbackOnEmpty = 1,
    min = 1,
    max = 9999,
    disabled = false,
    className,
    'aria-invalid': ariaInvalid,
}: OrdenInputProps) {
    return (
        <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(className)}
            value={value === '' ? '' : value}
            onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                    onChange('');
                    return;
                }

                const parsed = Number.parseInt(raw, 10);
                if (!Number.isNaN(parsed)) {
                    onChange(parsed);
                }
            }}
            onBlur={() => {
                if (value === '') {
                    onChange(fallbackOnEmpty);
                }
            }}
        />
    );
}
