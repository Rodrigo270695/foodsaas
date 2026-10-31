import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import type { Paginated } from '@/types';

export type MesaLibre = {
    id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
};

export type PedidoRow = {
    id: string;
    numero: number;
    estado: string;
    canal: string;
    total: string | number;
    created_at: string;
    cerrado_at?: string | null;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
};

export type PedidosFilters = {
    estado: string;
    desde: string | null;
    hasta: string | null;
    sede_id: string | null;
};

export type PedidosStats = {
    activos: number;
    en_cola: number;
    cerrados_hoy: number;
};

export type PedidosIndexProps = {
    pedidos: Paginated<PedidoRow>;
    mesas_libres: MesaLibre[];
    filters: PedidosFilters;
    stats: PedidosStats;
};

export function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export function formatFechaHora(iso: string): { fecha: string; hora: string } {
    return formatPeruDateTime(iso);
}

export function estadoTone(estado: string): string {
    switch (estado) {
        case 'borrador':
            return 'bg-muted text-muted-foreground';
        case 'abierto':
            return 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
        case 'cerrado':
            return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300';
        case 'anulado':
            return 'bg-rose-500/15 text-rose-800 dark:text-rose-300';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

/** Hoy en calendario Perú (America/Lima), formato YYYY-MM-DD. */
export function todayIso(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

export function isHistoricoEstado(estado: string): boolean {
    return (
        estado === 'historico' ||
        estado === 'cerrados' ||
        estado === 'anulados'
    );
}
