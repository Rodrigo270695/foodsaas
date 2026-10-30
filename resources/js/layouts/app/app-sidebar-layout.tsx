import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { FlashToastBridge } from '@/components/flash-toast-bridge';
import { TenantImpersonationBanner } from '@/components/tenant-impersonation-banner';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <FlashToastBridge />
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="flex h-svh max-h-svh flex-col overflow-hidden md:h-[calc(100svh-(--spacing(4)))] md:max-h-[calc(100svh-(--spacing(4)))]"
            >
                <TenantImpersonationBanner />
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
