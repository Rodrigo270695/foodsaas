# Salón — unión de mesas

## Problema

A veces solo hay mesas chicas libres (ej. dos de 4) y llega un grupo grande (familia de 6). En el salón se unen mesas físicas; FoodSaaS debe reflejar ese grupo como **una unidad operativa** (capacidad conjunta, misma cuenta futura).

## Qué hay hoy (implementado)

| Pieza | Detalle |
|-------|---------|
| Campo | `cfg_mesas.union_id` (UUID nullable). Mismo valor = mismo grupo. |
| API | `POST /salon/mesas/unir` con `mesa_ids[]` (2–8). `POST /salon/mesas/{mesa}/separar`. |
| Permiso | `salon.update` |
| UI | Arrastre desde el ícono de enlace + línea SVG con glow; modo “Unir mesas” (tap-tap) como alternativa accesible (WCAG 2.2). Badge **Unida** + capacidad de grupo. Menú ⋯ → Separar. |

Reglas actuales:

- Solo mesas **activas** de la **sede activa**.
- Solo mesas de la **misma zona** (no se une Principal con Terraza).
- Si una mesa ya pertenece a un grupo, unir con otra **absorbe / fusiona** grupos (misma zona).
- Separar manualmente: botón Unlink en la tarjeta, en el centro de la línea, o menú ⋯. Si quedan &lt; 2, se disuelve el grupo.
- Tras cobro (futuro): separación automática (ver abajo).

## Futuro: separación automática al cobrar / liberar

Aún **no** existe el módulo de ventas, comandas ni pagos. Cuando exista, la unión debe vivir el ciclo de una ocupación:

```
Disponible ──(unir)──► Grupo unido ──(abrir cuenta)──► Ocupado (grupo)
                                                         │
                                                         ▼
                                              cobro / cierre de cuenta
                                                         │
                                                         ▼
                                              union_id = null en todas
                                              (mesas de nuevo individuales)
```

### Comportamiento esperado (cuando exista POS)

1. **Abrir cuenta en un grupo**  
   Una sola cuenta / ticket para todas las mesas con el mismo `union_id`. La capacidad mostrada es la suma.

2. **Cobrar / cerrar la cuenta**  
   Al marcar la ocupación como pagada / liberada:
   - Poner `union_id = null` en **todas** las mesas del grupo.
   - Volver cada mesa a estado disponible (o el flujo de limpieza que se defina).

3. **No separar a mano durante la comida** (salvo fuerza mayor)  
   El botón Separar en salón puede quedar restringido si hay cuenta abierta, o pedir confirmación fuerte (“rompe el grupo y la cuenta”).

4. **Transferencia / cambio de mesa**  
   Si se mueve el grupo a otra zona, mover el `union_id` completo, no mesa a mesa.

### Hook sugerido (pseudocódigo)

```php
// Cuando exista App\Services\Pos\AccountCloser (o similar):
public function afterAccountClosed(Account $account): void
{
    $mesaIds = $account->mesaIds(); // o las del servicio
    $unionIds = Mesa::query()
        ->whereIn('id', $mesaIds)
        ->whereNotNull('union_id')
        ->pluck('union_id')
        ->unique();

    Mesa::query()
        ->whereIn('union_id', $unionIds)
        ->update(['union_id' => null]);
}
```

### UI futura

- En el plano: grupo unido + indicador “cuenta abierta”.
- Tras cobro: animación de disolución de la línea SVG (salida más rápida que la entrada).
- KDS / cocina: una sola comanda agrupada.

## Fuera de alcance ahora

- Ventas, tickets, métodos de pago, propinas.
- Estados ocupado / reservado / sucio (cuando existan, la unión interactúa con ellos).
- Plano libre drag-and-drop de posiciones físicas (hoy es grid; la línea une cards).

## Referencias de código

- Migración: `database/migrations/tenant/2026_10_30_210000_t021_mesa_union_id.php`
- Backend: `SalonController::unirMesas` / `separarMesa`
- Frontend: `resources/js/pages/salon/components/mesas-grid.tsx`, `mesa-floor-card.tsx`
