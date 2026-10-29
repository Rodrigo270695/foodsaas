<?php

namespace App\Tenancy\Exceptions;

use RuntimeException;
use Throwable;

class TenantNotFoundException extends RuntimeException
{
    public function __construct(
        public readonly string $identifier,
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf('Tenant no encontrado: "%s".', $identifier),
            0,
            $previous,
        );
    }
}
