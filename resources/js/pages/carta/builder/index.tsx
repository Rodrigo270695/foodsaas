import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    MoreHorizontal,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataTable,
    EmptyState,
    PageHeader,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import carta from '../carta-routes';
import { MenuFormModal } from './components/menu-form-modal';
import type { MenuCartaRow } from './types';

type BuilderIndexProps = {
    cartas: MenuCartaRow[];
    productos_activos: number;
    logo_url: string | null;
};

export default function BuilderIndex({
    cartas,
    productos_activos,
}: BuilderIndexProps) {
    const { t } = useTranslation(['carta', 'common']);
    const { can } = usePermission();
    const [createOpen, setCreateOpen] = useState(false);

    const columns: DataTableColumn<MenuCartaRow>[] = [
        {
            key: 'nombre',
            header: t('builder.columns.nombre'),
            cell: (row) => (
                <div>
                    <Link
                        href={carta.menus.edit(row.id).url}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                        data-flip-id={`menu-${row.id}`}
                    >
                        {row.nombre}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">
                        /m/{row.slug}
                    </p>
                </div>
            ),
        },
        {
            key: 'items',
            header: t('builder.columns.items'),
            cell: (row) => (
                <span className="tabular-nums text-sm">
                    {row.items_count ?? 0}
                </span>
            ),
        },
        {
            key: 'paginas',
            header: t('builder.columns.paginas'),
            cell: (row) => (
                <span className="tabular-nums text-sm">{row.paginas}</span>
            ),
            className: 'hidden sm:table-cell',
        },
        {
            key: 'estado',
            header: t('builder.columns.estado'),
            cell: (row) =>
                row.publicada ? (
                    <StatBadge
                        label={t('builder.status.published')}
                        value=""
                        variant="success"
                    />
                ) : (
                    <StatBadge
                        label={t('builder.status.draft')}
                        value=""
                        variant="muted"
                    />
                ),
        },
        {
            key: 'acciones',
            header: <span className="sr-only">{t('columns.acciones')}</span>,
            align: 'right',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild className="cursor-pointer gap-2">
                            <Link href={carta.menus.edit(row.id).url}>
                                <Pencil className="size-4" />
                                {t('builder.open_canvas')}
                            </Link>
                        </DropdownMenuItem>
                        {can('carta.armar') ? (
                            <DropdownMenuItem
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                onSelect={() => {
                                    if (
                                        window.confirm(
                                            t('builder.delete_confirm', {
                                                name: row.nombre,
                                            }),
                                        )
                                    ) {
                                        router.delete(
                                            carta.menus.destroy(row.id).url,
                                        );
                                    }
                                }}
                            >
                                <Trash2 className="size-4" />
                                {t('common:actions.delete')}
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <>
            <Head title={t('builder.title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('builder.title')}
                    description={t('builder.subtitle')}
                    action={
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer gap-2"
                            >
                                <Link href={carta.index().url}>
                                    <ArrowLeft className="size-4" />
                                    {t('builder.back')}
                                </Link>
                            </Button>
                            <Can permission="carta.armar">
                                <Button
                                    type="button"
                                    onClick={() => setCreateOpen(true)}
                                    className="cursor-pointer gap-2"
                                >
                                    <Plus className="size-4" />
                                    {t('builder.new_menu')}
                                </Button>
                            </Can>
                        </div>
                    }
                />

                <div className="rounded-2xl border border-brand-600/15 bg-gradient-to-r from-brand-50/60 to-transparent px-4 py-3 text-sm text-muted-foreground dark:from-brand-950/30">
                    <span className="inline-flex items-center gap-2 font-medium text-brand-800 dark:text-brand-200">
                        <Sparkles className="size-4" />
                        {t('builder.list_hint', { count: productos_activos })}
                    </span>
                </div>

                <DataTable
                    columns={columns}
                    data={cartas}
                    rowKey={(row) => row.id}
                    emptyState={
                        <EmptyState
                            icon={Sparkles}
                            title={t('builder.empty_title')}
                            description={t('builder.empty_description')}
                            action={
                                can('carta.armar') ? (
                                    <Button
                                        type="button"
                                        onClick={() => setCreateOpen(true)}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus className="size-4" />
                                        {t('builder.new_menu')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <MenuFormModal open={createOpen} onOpenChange={setCreateOpen} />
        </>
    );
}

BuilderIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Carta', href: '/carta' },
            { title: 'Armar', href: '/carta/armar' },
        ]}
    >
        {page}
    </AppLayout>
);
