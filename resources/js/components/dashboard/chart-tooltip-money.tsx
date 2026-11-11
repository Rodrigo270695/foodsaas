import { money } from '@/components/dashboard/format';

type ChartTooltipMoneyProps = {
    active?: boolean;
    payload?: Array<{ value?: number | string; name?: string }>;
    label?: string;
};

export function ChartTooltipMoney({
    active,
    payload,
    label,
}: ChartTooltipMoneyProps) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs shadow-md">
            <p className="mb-1 font-medium text-foreground">{label}</p>
            {payload.map((entry) => (
                <p
                    key={String(entry.name)}
                    className="tabular-nums text-muted-foreground"
                >
                    {typeof entry.value === 'number'
                        ? money(entry.value)
                        : entry.value}
                </p>
            ))}
        </div>
    );
}
