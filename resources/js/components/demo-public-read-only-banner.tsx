import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDemoMutationsLocked } from '@/hooks/use-demo-mutations-locked';
import { cn } from '@/lib/utils';

/**
 * Aviso global en el panel del tenant demo (solo lectura).
 */
export function DemoPublicReadOnlyBanner() {
    const { t } = useTranslation('demo');
    const demoLocked = useDemoMutationsLocked();

    if (!demoLocked) {
        return null;
    }

    return (
        <div
            role="status"
            className={cn(
                'flex shrink-0 items-center justify-center gap-2 border-b px-4 py-2 text-center text-sm',
                'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
            )}
        >
            <Eye className="size-4 shrink-0" aria-hidden />
            <span className="text-pretty">{t('read_only_banner')}</span>
        </div>
    );
}
