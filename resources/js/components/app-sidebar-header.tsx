import { ActiveSedeSwitcher } from '@/components/active-sede-switcher';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PwaInstallHeaderButton } from '@/components/pwa-install-banner';
import { ServicioFeedInbox } from '@/components/servicio/servicio-feed-inbox';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-1.5 overflow-visible border-b border-border/60 bg-white px-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:gap-2 sm:px-3 md:px-4 dark:bg-background">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden sm:gap-1.5 md:gap-2">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <div className="hidden min-w-0 flex-1 sm:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
                <ServicioFeedInbox />
                <ActiveSedeSwitcher />
                <PwaInstallHeaderButton />
            </div>
        </header>
    );
}
