import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import subscriptionExpiryEn from '@/lang/en/subscription-expiry.json';
import subscriptionExpiryEs from '@/lang/es/subscription-expiry.json';
import suscripcionesEn from '@/lang/en/suscripciones.json';
import suscripcionesEs from '@/lang/es/suscripciones.json';
import tenantsEn from '@/lang/en/tenants.json';
import tenantsEs from '@/lang/es/tenants.json';
import planesEn from '@/lang/en/planes.json';
import planesEs from '@/lang/es/planes.json';
import rolesEn from '@/lang/en/roles.json';
import rolesEs from '@/lang/es/roles.json';
import usuariosEn from '@/lang/en/usuarios.json';
import usuariosEs from '@/lang/es/usuarios.json';
import authEn from '@/lang/en/auth.json';
import commonEn from '@/lang/en/common.json';
import formsEn from '@/lang/en/forms.json';
import navEn from '@/lang/en/nav.json';
import settingsEn from '@/lang/en/settings.json';
import legalEn from '@/lang/en/legal.json';
import authEs from '@/lang/es/auth.json';
import commonEs from '@/lang/es/common.json';
import formsEs from '@/lang/es/forms.json';
import legalEs from '@/lang/es/legal.json';
import navEs from '@/lang/es/nav.json';
import settingsEs from '@/lang/es/settings.json';

export const LOCALE_STORAGE_KEY = 'foodsaas.locale';

export const SUPPORTED_LOCALES = ['es', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'es';

const resources = {
    es: {
        common: commonEs,
        nav: navEs,
        auth: authEs,
        settings: settingsEs,
        legal: legalEs,
        roles: rolesEs,
        usuarios: usuariosEs,
        forms: formsEs,
        planes: planesEs,
        tenants: tenantsEs,
        suscripciones: suscripcionesEs,
        'subscription-expiry': subscriptionExpiryEs,
    },
    en: {
        common: commonEn,
        nav: navEn,
        auth: authEn,
        settings: settingsEn,
        legal: legalEn,
        roles: rolesEn,
        usuarios: usuariosEn,
        forms: formsEn,
        planes: planesEn,
        tenants: tenantsEn,
        suscripciones: suscripcionesEn,
        'subscription-expiry': subscriptionExpiryEn,
    },
} as const;

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: SUPPORTED_LOCALES as unknown as string[],
        defaultNS: 'common',
        ns: ['common', 'nav', 'auth', 'settings', 'legal', 'roles', 'usuarios', 'forms', 'planes', 'tenants', 'suscripciones', 'subscription-expiry'],
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['htmlTag', 'localStorage', 'navigator'],
            lookupLocalStorage: LOCALE_STORAGE_KEY,
            caches: ['localStorage'],
        },
        react: {
            useSuspense: false,
        },
    });

function syncHtmlLang(locale: string): void {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', locale);
    }
}

syncHtmlLang(i18n.language || DEFAULT_LOCALE);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
