import { Link } from '@inertiajs/react';
import {
    Activity,
    Banknote,
    BarChart3,
    BookOpenCheck,
    Bot,
    Building2,
    Cog,
    Database,
    Gauge,
    KeyRound,
    LayoutGrid,
    LineChart,
    MapPin,
    Megaphone,
    MessageCircle,
    Repeat,
    Server,
    ShieldCheck,
    Sparkles,
    Store,
    UserCog,
    Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppLogo from '@/components/app-logo';
import { NavMainCollapsible } from '@/components/sidebar/nav-main-collapsible';
import { SidebarAppVersion } from '@/components/sidebar/sidebar-app-version';
import { NavUser } from '@/components/nav-user';
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

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="shrink-0">
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
