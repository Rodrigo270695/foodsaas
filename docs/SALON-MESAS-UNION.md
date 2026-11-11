# Salón — unión de mesas

## Problema

A veces solo hay mesas chicas libres (ej. dos de 4) y llega un grupo grande (familia de 6). En el salón se unen mesas físicas; FoodSaaS refleja ese grupo como **una unidad operativa** (capacidad conjunta, misma cuenta).

## Qué hay hoy (implementado)

| Pieza | Detalle |
|-------|---------|
| Campo | `cfg_mesas.union_id` (UUID nullable). Mismo valor = mismo grupo. |
| API | `POST /salon/mesas/unir` con `mesa_ids[]` (2–8). `POST /salon/mesas/{mesa}/separar`. |
| Permiso | `salon.update` |
| UI | Arrastre / modo Unir (tap-tap). Las unidas se renderizan como **un solo card** (`MesaUnionCard`) con tablero alargado y códigos. |
| Pedido | `PedidoService` / `openOrCreateUnionPedido`: una cuenta por grupo (reutiliza pedido activo de cualquier mesa del `union_id`). |
| Cobro | Al cerrar el pedido, `CajaService::autoSepararUnionTrasCobro` limpia `union_id` si no quedan pedidos activos en el grupo. |
| Separar | Bloqueado (UI + backend) mientras el grupo tiene pedido activo. |

Reglas actuales:

- Solo mesas **activas** de la **sede activa**.
- Solo mesas de la **misma zona** (no se une Principal con Terraza).
- Si una mesa ya pertenece a un grupo, unir con otra **absorbe / fusiona** grupos (misma zona).
- En el plano: un card de grupo (`col-span-2`) en lugar de N cards + líneas.
- Separar grupo: Unlink en el card (disuelve vía API `separar`). Menú ⋯: editar / sacar una mesa / borrar — solo si **no** hay cuenta abierta.
- Tras cobro exitoso: el grupo se disuelve solo si no quedan pedidos activos en el `union_id`.

## Flujo operativo

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

1. **Abrir cuenta en un grupo** — una sola comanda / ticket; capacidad = suma.
2. **Cobrar / cerrar** — al pagar, auto-separar si no quedan activos.
3. **No separar a mano durante la comida** — Separar queda bloqueado con cuenta abierta (mensaje claro).
4. **Transferencia / cambio de mesa** — pendiente de producto (mover el `union_id` completo).

## UI futura (opcional)

- Animación de disolución del card de grupo tras cobro.
- KDS: etiqueta de grupo en la comanda.
