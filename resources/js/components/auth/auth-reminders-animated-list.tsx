import { Bell, ChefHat, Clock, MessageCircle, UtensilsCrossed } from 'lucide-react';
import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedList } from '@/components/ui/animated-list';
import { cn } from '@/lib/utils';

type ReminderNotice = {
    title: string;
    subtitle: string;
    time: string;
    color: string;
    icon: ComponentType<{ className?: string }>;
};

function ReminderCard({ title, subtitle, time, color, icon: Icon }: ReminderNotice) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-3 py-2.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-zinc-900/80">
            <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: color }}
            >
                <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[0.8rem] font-semibold text-zinc-800 dark:text-zinc-100">
                    {title}
                    <span className="font-normal text-zinc-400"> · {time}</span>
                </p>
                <p className="truncate text-[0.7rem] text-zinc-500">{subtitle}</p>
            </div>
        </div>
    );
}

export function AuthRemindersAnimatedList({ className }: { className?: string }) {
    const { t, i18n } = useTranslation('auth');

    const notices = useMemo<ReminderNotice[]>(
        () => [
            {
                title: t('reminders.order_ready_title'),
                subtitle: t('reminders.order_ready_sub'),
                time: t('reminders.time_1'),
                color: '#EC4899',
                icon: ChefHat,
            },
            {
                title: t('reminders.new_order_title'),
                subtitle: t('reminders.new_order_sub'),
                time: t('reminders.time_3'),
                color: '#3B82F6',
                icon: UtensilsCrossed,
            },
            {
                title: t('reminders.cash_title'),
                subtitle: t('reminders.cash_sub'),
                time: t('reminders.time_8'),
                color: '#F59E0B',
                icon: Clock,
            },
            {
                title: t('reminders.stock_title'),
                subtitle: t('reminders.stock_sub'),
                time: t('reminders.time_12'),
                color: '#10B981',
                icon: Bell,
            },
            {
                title: t('reminders.delivery_title'),
                subtitle: t('reminders.delivery_sub'),
                time: t('reminders.time_2'),
                color: '#6366F1',
                icon: MessageCircle,
            },
        ],
        [t, i18n.language],
    );

    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none absolute w-[17.5rem] rounded-2xl border border-border/60 bg-card/85 p-3 text-left shadow-[0_20px_60px_-30px_rgba(64,0,32,0.35)] backdrop-blur-xl dark:bg-card/60',
                className,
            )}
        >
            <div className="relative h-[17.5rem] overflow-hidden">
                <AnimatedList delay={1700} className="px-0.5">
                    {notices.map((notice) => (
                        <ReminderCard key={notice.title} {...notice} />
                    ))}
                </AnimatedList>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/80 to-transparent dark:from-card" />
            </div>
            <p className="mt-1 px-1 text-sm font-semibold text-foreground">
                {t('bento.live_title')}
            </p>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                {t('bento.live_body')}
            </p>
        </div>
    );
}
