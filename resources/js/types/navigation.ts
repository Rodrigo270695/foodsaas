import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
};

export type NavContext = 'central' | 'tenant' | 'both';

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    permission?: string | string[];
    context?: NavContext;
    implemented?: boolean;
    requiresBotIa?: boolean;
    requiresModoAsesora?: boolean;
    novedadWhenBotIaInactive?: boolean;
    moduleKey?: string;
    badgeCount?: number;
};

export type NavGroup = {
    title: string;
    icon?: LucideIcon;
    defaultOpen?: boolean;
    permission?: string | string[];
    context?: NavContext;
    items: NavItem[];
};
