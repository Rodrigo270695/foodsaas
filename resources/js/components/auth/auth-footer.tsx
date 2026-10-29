import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalModal, useLegalModal } from '@/components/legal/legal-modal';
import type { LegalDocId } from '@/components/legal/legal-docs';

type AuthFooterProps = {
    brandName: string;
};

const FOOTER_LINKS: { id: LegalDocId; key: string }[] = [
    { id: 'terminos', key: 'terms' },
    { id: 'privacidad', key: 'privacy' },
    { id: 'datos', key: 'data' },
    { id: 'cookies', key: 'cookies' },
    { id: 'seguridad', key: 'security' },
    { id: 'soporte', key: 'support' },
];

export default function AuthFooter({ brandName }: AuthFooterProps) {
    const year = new Date().getFullYear();
    const legal = useLegalModal();
    const { t } = useTranslation('legal');

    return (
        <>
            <footer className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-6 pb-6 text-center text-xs text-muted-foreground/80 sm:flex-row sm:justify-between sm:pb-8">
                <span>
                    © {year} {brandName} · {t('footer.made_in')}
                </span>
                <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    {FOOTER_LINKS.map((link, index) => (
                        <span key={link.id} className="contents">
                            {index > 0 ? (
                                <span aria-hidden="true">·</span>
                            ) : null}
                            <FooterButton onClick={() => legal.openDoc(link.id)}>
                                {t(`footer.${link.key}`)}
                            </FooterButton>
                        </span>
                    ))}
                </span>
            </footer>
            <LegalModal
                open={legal.open}
                onOpenChange={legal.setOpen}
                docId={legal.docId}
                onDocIdChange={legal.setDocId}
            />
        </>
    );
}

function FooterButton({
    onClick,
    children,
}: {
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="cursor-pointer rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            {children}
        </button>
    );
}
