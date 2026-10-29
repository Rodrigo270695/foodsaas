/** Clave i18n (`auth.editorial.*`) por componente Inertia. */
export const AUTH_PAGE_EDITORIAL: Record<string, string> = {
    'auth/login': 'login',
    'auth/forgot-password': 'forgot_password',
    'auth/reset-password': 'reset_password',
    'auth/verify-email': 'verify_email',
    'auth/confirm-password': 'confirm_password',
    'auth/two-factor-challenge': 'two_factor',
};

export type AuthEditorialKey =
    | 'login'
    | 'forgot_password'
    | 'reset_password'
    | 'verify_email'
    | 'confirm_password'
    | 'two_factor'
    | 'two_factor_recovery';
