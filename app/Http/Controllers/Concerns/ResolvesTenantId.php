<?php

namespace App\Http\Controllers\Concerns;

use Symfony\Component\HttpKernel\Exception\HttpException;

trait ResolvesTenantId
{
    protected function tenantIdOrAbort(): string
    {
        $id = tenant_id();

        if ($id === null || $id === '') {
            throw new HttpException(404, 'Tenant no resuelto.');
        }

        return (string) $id;
    }
}
