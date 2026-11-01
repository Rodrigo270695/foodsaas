<?php

namespace App\Services\Integrations\Concerns;

use App\Services\Integrations\ApiPeruConsultaException;
use Illuminate\Http\Client\ConnectionException;
use RuntimeException;
use Throwable;

trait FallsBackToApisunatLookup
{
    /**
     * Primero ApiPerú; si falla (cuota, red, datos, etc.) intenta APISUNAT/Lucode.
     *
     * @param  callable(): array<string, mixed>  $apiPeruFetch
     * @param  callable(): array<string, mixed>  $apisunatFetch
     * @return array<string, mixed>
     */
    private function consultarConFallbackApisunat(callable $apiPeruFetch, callable $apisunatFetch): array
    {
        try {
            return $apiPeruFetch();
        } catch (Throwable $primary) {
            if (! $this->apisunatLookup->isConfigured()) {
                $this->rethrowPrimary($primary);
            }

            if (! $this->shouldFallbackToApisunat($primary)) {
                $this->rethrowPrimary($primary);
            }

            try {
                return $apisunatFetch();
            } catch (Throwable) {
                // Si el plan B también falla, conservar el error original.
                $this->rethrowPrimary($primary);
            }
        }
    }

    private function shouldFallbackToApisunat(Throwable $e): bool
    {
        if ($e instanceof ConnectionException) {
            return true;
        }

        if ($e instanceof RuntimeException && ! $e instanceof ApiPeruConsultaException) {
            // Respuesta inválida / “no encontrado” de ApiPerú → intentar Lucode.
            return true;
        }

        if (! $e instanceof ApiPeruConsultaException) {
            return true;
        }

        return in_array($e->errorCode, [
            'rate_limit',
            'service_unavailable',
            'api_error',
            'not_configured',
            'not_found',
            'plan_restricted',
        ], true);
    }

    private function rethrowPrimary(Throwable $e): never
    {
        if ($e instanceof ApiPeruConsultaException || $e instanceof RuntimeException) {
            throw $e;
        }

        if ($e instanceof ConnectionException) {
            throw new ApiPeruConsultaException(
                __('propietarios.consulta.no_disponible'),
                503,
                'service_unavailable',
            );
        }

        throw new ApiPeruConsultaException(
            __('propietarios.consulta.no_disponible'),
            503,
            'service_unavailable',
        );
    }
}
