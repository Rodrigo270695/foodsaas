import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import type { Auth } from '@/types';

export type PermissionInput = string | string[];

export type UsePermissionReturn = {
    permissions: string[];
    roles: string[];
    isSuperadmin: boolean;
    can: (permission: PermissionInput) => boolean;
    canAll: (permissions: string[]) => boolean;
    hasRole: (role: string) => boolean;
};

export function usePermission(): UsePermissionReturn {
    const page = usePage<{ auth?: Auth }>();
    const auth = page.props.auth;

    const permissions = useMemo(
        () => auth?.permissions ?? [],
        [auth?.permissions],
    );
    const roles = useMemo(() => auth?.roles ?? [], [auth?.roles]);
    const permissionSet = useMemo(() => new Set(permissions), [permissions]);
    const isSuperadmin = roles.includes('superadmin');

    const can = (input: PermissionInput): boolean => {
        if (isSuperadmin) {
            return true;
        }

        const list = Array.isArray(input) ? input : [input];

        return list.some((p) => permissionSet.has(p));
    };

    const canAll = (list: string[]): boolean => {
        if (isSuperadmin) {
            return true;
        }

        return list.every((p) => can(p));
    };

    const hasRole = (role: string): boolean => roles.includes(role);

    return {
        permissions,
        roles,
        isSuperadmin,
        can,
        canAll,
        hasRole,
    };
}
