import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/forms';
import { Input } from '@/components/ui/input';

export const HORARIO_DIAS = [
    'lun',
    'mar',
    'mie',
    'jue',
    'vie',
    'sab',
    'dom',
] as const;

export type HorarioDiaKey = (typeof HORARIO_DIAS)[number];

export type HorarioDia = {
    abierto: boolean;
    abre: string;
    cierra: string;
};

export type HorarioAtencion = Record<HorarioDiaKey, HorarioDia>;

export const defaultHorarioAtencion = (): HorarioAtencion =>
    HORARIO_DIAS.reduce((acc, dia) => {
        acc[dia] = { abierto: true, abre: '11:00', cierra: '23:00' };

        return acc;
    }, {} as HorarioAtencion);

export function summarizeHorarioAtencion(
    value: Partial<HorarioAtencion> | null | undefined,
    labels: { closed: string; mixed: (days: number) => string },
): string {
    const horario = normalizeHorarioAtencion(value);
    const open = HORARIO_DIAS.filter((dia) => horario[dia].abierto);

    if (open.length === 0) {
        return labels.closed;
    }

    const first = horario[open[0]];
    const sameHours = open.every(
        (dia) =>
            horario[dia].abre === first.abre &&
            horario[dia].cierra === first.cierra,
    );
    const hours = `${first.abre}–${first.cierra}`;

    if (!sameHours) {
        return labels.mixed(open.length);
    }

    if (open.length === 7) {
        return hours;
    }

    return `${open.length}/7 · ${hours}`;
}

export function normalizeHorarioAtencion(
    value: Partial<HorarioAtencion> | null | undefined,
): HorarioAtencion {
    const defaults = defaultHorarioAtencion();
    if (!value) {
        return defaults;
    }

    return HORARIO_DIAS.reduce((acc, dia) => {
        acc[dia] = {
            abierto: value[dia]?.abierto ?? defaults[dia].abierto,
            abre: value[dia]?.abre ?? defaults[dia].abre,
            cierra: value[dia]?.cierra ?? defaults[dia].cierra,
        };

        return acc;
    }, {} as HorarioAtencion);
}

type HorarioSemanalEditorProps = {
    value: HorarioAtencion;
    onChange: (next: HorarioAtencion) => void;
    disabled?: boolean;
    errors?: Partial<Record<string, string>>;
    labels: {
        abre: string;
        cierra: string;
        abierto: string;
        cerrado: string;
        dias: Record<HorarioDiaKey, string>;
    };
};

export function HorarioSemanalEditor({
    value,
    onChange,
    disabled = false,
    errors = {},
    labels,
}: HorarioSemanalEditorProps) {
    const patchDia = (dia: HorarioDiaKey, patch: Partial<HorarioDia>) => {
        onChange({
            ...value,
            [dia]: { ...value[dia], ...patch },
        });
    };

    return (
        <div className="flex flex-col gap-2">
            {HORARIO_DIAS.map((dia) => {
                const row = value[dia];

                return (
                    <div
                        key={dia}
                        className="grid items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:grid-cols-[9rem_1fr]"
                    >
                        <label
                            htmlFor={`horario-${dia}-abierto`}
                            className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                        >
                            <Checkbox
                                id={`horario-${dia}-abierto`}
                                checked={row.abierto}
                                onCheckedChange={(c) =>
                                    patchDia(dia, { abierto: c === true })
                                }
                                disabled={disabled}
                            />
                            <span className="min-w-0">
                                <span className="block">{labels.dias[dia]}</span>
                                <span className="text-xs font-normal text-muted-foreground">
                                    {row.abierto
                                        ? labels.abierto
                                        : labels.cerrado}
                                </span>
                            </span>
                        </label>

                        <div className="grid min-w-0 grid-cols-2 gap-3">
                            <FormField
                                id={`horario-${dia}-abre`}
                                label={labels.abre}
                                error={errors[`horario_atencion.${dia}.abre`]}
                            >
                                <Input
                                    id={`horario-${dia}-abre`}
                                    type="time"
                                    value={row.abre}
                                    onChange={(e) =>
                                        patchDia(dia, { abre: e.target.value })
                                    }
                                    disabled={disabled || !row.abierto}
                                    className="tabular-nums"
                                />
                            </FormField>
                            <FormField
                                id={`horario-${dia}-cierra`}
                                label={labels.cierra}
                                error={
                                    errors[`horario_atencion.${dia}.cierra`]
                                }
                            >
                                <Input
                                    id={`horario-${dia}-cierra`}
                                    type="time"
                                    value={row.cierra}
                                    onChange={(e) =>
                                        patchDia(dia, {
                                            cierra: e.target.value,
                                        })
                                    }
                                    disabled={disabled || !row.abierto}
                                    className="tabular-nums"
                                />
                            </FormField>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
