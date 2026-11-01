import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Armchair,
    BarChart3,
    BookOpenCheck,
    Bot,
    Building2,
    BookOpen,
    ChefHat,
    ClipboardList,
    Cog,
    CreditCard,
    Database,
    FileBarChart,
    FileText,
    FileX,
    Gauge,
    Hash,
    KeyRound,
    LayoutGrid,
    LineChart,
    MapPin,
    Megaphone,
    MessageCircle,
    Receipt,
    Repeat,
    Server,
    ShieldCheck,
    Sparkles,
    Store,
    UserCog,
    UtensilsCrossed,
    Wallet,
    Warehouse,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import { NavMainCollapsible } from '@/components/sidebar/nav-main-collapsible';
import { SidebarAppVersion } from '@/components/sidebar/sidebar-app-version';
import { SidebarPlanBadge } from '@/components/sidebar/sidebar-plan-badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { markPendingViewEnter } from '@/lib/session-enter';
import { dashboard } from '@/routes';
import type { NavGroup, NavItem } from '@/types';

/**
 * Catálogo del sidebar (traducido). Filtrado por permisos, contexto e
 * implementación en {@link NavMainCollapsible}.
 */
export function useNavConfig(): { singles: NavItem[]; groups: NavGroup[] } {
    const { t } = useTranslation('nav');

    return useMemo(
        () => ({
            singles: [
                {
                    title: t('items.dashboard'),
                    href: dashboard(),
                    icon: LayoutGrid,
                    permission: 'dashboard.view',
                    context: 'both',
                },
            ],
            groups: [
                {
                    title: t('groups.catalogo'),
                    icon: BookOpen,
                    context: 'tenant',
                    items: [
                        {
                            title: t('items.carta'),
                            href: '/carta',
                            icon: UtensilsCrossed,
                            permission: 'carta.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.almacen'),
                            href: '/almacen',
                            icon: Warehouse,
                            permission: 'almacen.view',
                            context: 'tenant',
                        },
                    ],
                },
                {
                    title: t('groups.servicio'),
                    icon: UtensilsCrossed,
                    context: 'tenant',
                    defaultOpen: true,
                    items: [
                        {
                            title: t('items.salon'),
                            href: '/salon',
                            icon: Armchair,
                            permission: 'salon.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.pedidos'),
                            href: '/pedidos',
                            icon: ClipboardList,
                            permission: 'pedidos.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.cocina'),
                            href: '/cocina',
                            icon: ChefHat,
                            permission: 'cocina.view',
                            context: 'tenant',
                        },
                    ],
                },
                {
                    title: t('groups.cobros'),
                    icon: Wallet,
                    context: 'tenant',
                    items: [
                        {
                            title: t('items.caja'),
                            href: '/caja',
                            icon: Wallet,
                            permission: 'caja.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.ventas'),
                            href: '/ventas',
                            icon: Receipt,
                            permission: ['ventas.view', 'caja.view'],
                            context: 'tenant',
                        },
                    ],
                },
                {
                    title: t('groups.facturacion'),
                    icon: Receipt,
                    context: 'tenant',
                    items: [
                        {
                            title: t('items.documentos'),
                            href: '/facturacion/documentos',
                            icon: FileText,
                            permission: 'documentos.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.series'),
                            href: '/facturacion/series',
                            icon: Hash,
                            permission: 'series.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.notas_baja'),
                            href: '/facturacion/notas-baja',
                            icon: FileX,
                            permission: 'notas-baja.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.resumenes'),
                            href: '/facturacion/resumenes',
                            icon: FileBarChart,
                            permission: 'resumenes.view',
                            context: 'tenant',
                        },
                    ],
                },
                {
                    title: t('groups.configuracion'),
                    icon: Cog,
                    context: 'tenant',
                    items: [
                        {
                            title: t('items.general'),
                            href: '/configuracion/general',
                            icon: Store,
                            permission: 'config-general.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.mi_suscripcion'),
                            href: '/configuracion/suscripcion',
                            icon: CreditCard,
                            permission: 'config-general.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.sedes'),
                            href: '/configuracion/sedes',
                            icon: MapPin,
                            permission: 'sedes.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.roles'),
                            href: '/configuracion/roles',
                            icon: ShieldCheck,
                            permission: 'roles.view',
                            context: 'tenant',
                        },
                        {
                            title: t('items.usuarios'),
                            href: '/configuracion/usuarios',
                            icon: UserCog,
                            permission: 'usuarios.view',
                            context: 'tenant',
                        },
                    ],
                },
                {
                    title: t('groups.configuracion'),
                    icon: Cog,
                    context: 'central',
                    items: [
                        {
                            title: t('items.roles'),
                            href: '/configuracion/roles',
                            icon: ShieldCheck,
                            permission: 'roles.view',
                        },
                        {
                            title: t('items.usuarios'),
                            href: '/configuracion/usuarios',
                            icon: UserCog,
                            permission: 'usuarios.view',
                        },
                    ],
                },
                {
                    title: t('groups.plataforma_sistema'),
                    icon: Server,
                    context: 'central',
                    items: [
                        {
                            title: t('items.operaciones'),
                            href: '/plataforma/operaciones',
                            icon: Activity,
                            permission: 'plataforma-operaciones.view',
                        },
                        {
                            title: t('items.esquema_bd'),
                            href: '/plataforma/esquema',
                            icon: Database,
                            permission: 'plataforma-operaciones.view',
                        },
                        {
                            title: t('items.sesiones_login'),
                            href: '/plataforma/sesiones-login',
                            icon: KeyRound,
                            permission: 'plataforma-operaciones.view',
                        },
                    ],
                },
                {
                    title: t('groups.plataforma_reportes'),
                    icon: BarChart3,
                    context: 'central',
                    items: [
                        {
                            title: t('items.reportes_plataforma'),
                            href: '/plataforma/reportes',
                            icon: LineChart,
                            permission: 'plataforma-reportes.view',
                        },
                        {
                            title: t('items.mapa_restaurantes'),
                            href: '/plataforma/reportes/mapa',
                            icon: MapPin,
                            permission: 'plataforma-reportes.view',
                        },
                    ],
                },
                {
                    title: t('groups.plataforma_restaurantes'),
                    icon: Building2,
                    context: 'central',
                    items: [
                        {
                            title: t('items.tenants'),
                            href: '/plataforma/tenants',
                            icon: Store,
                            permission: 'plataforma-tenants.view',
                        },
                    ],
                },
                {
                    title: t('groups.plataforma_cobros'),
                    icon: Wallet,
                    context: 'central',
                    items: [
                        {
                            title: t('items.planes'),
                            href: '/plataforma/planes',
                            icon: Sparkles,
                            permission: 'plataforma-planes.view',
                        },
                        {
                            title: t('items.suscripciones'),
                            href: '/plataforma/suscripciones',
                            icon: Repeat,
                            permission: 'plataforma-suscripciones.view',
                        },
                        {
                            title: t('items.uso_planes'),
                            href: '/plataforma/uso-planes',
                            icon: Gauge,
                            permission: 'plataforma-suscripciones.view',
                        },
                        {
                            title: t('items.cobros'),
                            href: '/plataforma/cobros',
                            icon: Wallet,
                            permission: 'plataforma-cobros.view',
                        },
                    ],
                },
                {
                    title: t('groups.plataforma_ventas'),
                    icon: Bot,
                    context: 'central',
                    items: [
                        {
                            title: t('items.salesbot_knowledge'),
                            href: '/plataforma/salesbot-knowledge',
                            icon: Bot,
                            permission: 'salesbot-knowledge.view',
                        },
                        {
                            title: t('items.salesbot_conversations'),
                            href: '/plataforma/salesbot-conversations',
                            icon: MessageCircle,
                            permission: 'salesbot-knowledge.view',
                        },
                    ],
                },
                {
                    title: t('groups.plataforma_producto'),
                    icon: BookOpenCheck,
                    context: 'central',
                    items: [
                        {
                            title: t('items.in_app_assistant_knowledge'),
                            href: '/plataforma/in-app-assistant-knowledge',
                            icon: BookOpenCheck,
                            permission: 'in-app-assistant-knowledge.view',
                        },
                        {
                            title: t('items.bot_ia_announcements'),
                            href: '/plataforma/bot-ia-announcements',
                            icon: Megaphone,
                            permission: 'bot-ia-announcements.view',
                        },
                    ],
                },
            ],
        }),
        [t],
    );
}

export function AppSidebar() {
    const { t } = useTranslation('nav');
    const { singles, groups } = useNavConfig();
    const hasTenant = usePage().props.tenant != null;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="shrink-0 gap-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={dashboard()}
                                onClick={() => markPendingViewEnter()}
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                {hasTenant ? <SidebarPlanBadge /> : null}
            </SidebarHeader>

            <SidebarContent>
                <NavMainCollapsible
                    label={t('section')}
                    singles={singles}
                    groups={groups}
                />
            </SidebarContent>

            <SidebarFooter>
                <SidebarAppVersion />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
