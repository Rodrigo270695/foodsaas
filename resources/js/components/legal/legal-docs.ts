import type { TFunction } from 'i18next';

export type LegalDocId =
    | 'terminos'
    | 'privacidad'
    | 'datos'
    | 'cookies'
    | 'seguridad'
    | 'soporte';

export type LegalBlock =
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] };

export type LegalDoc = {
    id: LegalDocId;
    label: string;
    title: string;
    updated: string;
    blocks: LegalBlock[];
};

export const LEGAL_DOC_ORDER: LegalDocId[] = [
    'terminos',
    'privacidad',
    'datos',
    'cookies',
    'seguridad',
    'soporte',
];

export function getLegalDoc(
    t: TFunction<'legal'>,
    docId: LegalDocId,
): LegalDoc {
    return {
        id: docId,
        label: t(`docs.${docId}.label`),
        title: t(`docs.${docId}.title`),
        updated: t(`docs.${docId}.updated`),
        blocks: t(`docs.${docId}.blocks`, {
            returnObjects: true,
        }) as LegalBlock[],
    };
}
