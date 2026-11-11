# FoodSaaS — Brief para post / flyer tipo VetSaaS

Documento listo para diseñar o generar (IA / diseñador) un **post vertical o flyer** al estilo del de VetSaaS: collage de UI arriba + bloque de copy + CTA Orvae abajo.

**Referencia visual:** flyer VetSaaS (Orvae) — collage de pantallas + mascota/ambiente + headline + WhatsApp + logo Orvae.

---

## 1. Identidad de marca

| Campo | Valor |
|--------|--------|
| **Producto** | FoodSaaS |
| **Tagline corto** | Gestión para restaurantes |
| **Empresa** | Orvae Software Development |
| **Sitio producto** | https://foodsaas.orvae.pe |
| **Sitio empresa** | https://orvae.pe |
| **Demo** | https://demo.foodsaas.orvae.pe/login |
| **WhatsApp asesoría** | 976 809 804 |
| **CTA** | Asesoría Gratuita |
| **Vertical** | Restaurantes / foodservice (Perú, SUNAT) |

### Colores (oficiales)

| Token | Hex / nota |
|--------|------------|
| Brand primario | `#660033` (burdeos) |
| Brand claro (wash) | `#F9F0F4` approx (brand-50) |
| Fondo UI | casi blanco frío `#F8FAFC` |
| Texto | stone oscuro |
| Success | verde operativo |
| Warning | ámbar |
| Info | sky |
| Neutros | stone (como VetSaaS) |

**No usar** púrpura genérico ni teal de VetSaaS: FoodSaaS = **burdeos `#660033`**.

### Tipografía

- UI / post: **Instrument Sans** (o Inter solo si no hay Instrument).
- Headline del flyer: bold, tracking tight, alto contraste sobre fondo brand oscuro.

### Logo / assets

- Logo FoodSaaS + wordmark.
- Logo Orvae (esquina inferior derecha, como en VetSaaS).
- Favicon / PWA icons del repo (`public/`).

---

## 2. Copy del post (ES)

### Headline (espejo VetSaaS)

> **FoodSaaS: Gestión integral para tu restaurante**

### Subheadline / valor

> Un sistema todo en uno para administrar salón, pedidos, cocina, caja, carta, almacén, delivery, reservas y facturación electrónica (SUNAT).

### Variantes cortas (Stories / ads)

1. Sala → cocina → caja → SUNAT, en un solo lugar.
2. El POS de piso que tu restaurante sí usa.
3. Multi-sede, PWA mesero/cocina y boleta al cobrar.

### CTA box

```
Asesoría Gratuita:
WhatsApp 976 809 804
orvae.pe
```

### Hashtags sugeridos

`#FoodSaaS` `#Orvae` `#RestaurantesPerú` `#FacturacionElectronica` `#SUNAT` `#POS` `#SaaS`

---

## 3. Módulos a mostrar en el collage (UI cards)

Priorizar **6–8 widgets** legibles (como VetSaaS). Datos de ejemplo ficticios, en español Perú (S/).

### A. Sidebar (fondo del collage)

Ítems visibles (burdeos activo en Dashboard):

- Dashboard  
- Carta  
- Almacén / Insumos  
- Salón  
- Pedidos  
- Cocina  
- Delivery  
- Reservas  
- Caja  
- Ventas  
- Clientes  
- Reportes  
- Facturación  
- Configuración  

Marca en header sidebar: **FoodSaaS** · *Gestión para restaurantes*

### B. Card — Salón / mesas

- Título: **Salón**
- Zonas: Terraza / Salón principal  
- Estados: Libre · Ocupada · Cuenta  
- Ejemplo: Mesa 12 — 4 comensales · Pedido #184  
- Unión de mesas (badge “Unión”)

### C. Card — Pedidos / ticket

- Título: **Pedido #184** · Canal Salón  
- Líneas: Lomo saltado ×1 · Chicha ×2 · Ají de gallina ×1  
- Subtotal / descuento gerente / total **S/ 86.50**  
- Estados: Enviado · En cocina · Listo  

### D. Card — Cocina (KDS)

- Título: **Cocina** · Tiempo real  
- Cola: 2× Lomo · 1× Ají · 3× Anticuchos  
- Badges: En cola · Listo  
- Hint: “Reverb / live” (sin texto técnico en el flyer; solo sensación de live)

### E. Card — Caja

- Título: **Caja abierta** · SEDE-001  
- Apertura: S/ 200.00  
- Ventas turno: **S/ 3 480.00**  
- Tickets: 42 · Ticket prom. S/ 82.86  
- Medios: Efectivo · Yape · Tarjeta  

### F. Card — Ventas / cobro

- Título: **Cobrar**  
- Boleta / Factura  
- Cliente: RUC / DNI lookup  
- Medios de pago chips  
- Total a cobrar destacado en burdeos  

### G. Card — Facturación electrónica

- Título: **Comprobantes**  
- Emitidos 128 · Pendientes 7 · Anulados 2  
- Filas: B001-000128 Emitida · F001-000045 Enviada  
- Badge SUNAT / APISUNAT  

### H. Card — Carta / menú

- Categorías: Entradas · Fondos · Bebidas  
- Producto con precio S/ y badge “En menú”  
- Receta / foodcost % opcional (chip 28%)

### I. Card — Inventario / insumos

- Stock bajo: 8 insumos  
- Kardex: Entrada OC-012 · Consumo venta  
- Top: Pollo · Arroz · Aceite  

### J. Card — Delivery

- Pedidos activos: 5  
- Estados: Preparando · En camino · Entregado  
- Cliente + distrito (Miraflores)

### K. Card — Reservas

- Hoy: 6 reservas  
- Mesa 8 · 20:30 · 4 pers. · Confirmada  

### L. Card — Dashboard / KPIs (opcional)

- Ventas hoy S/ 3 480 · Δ +12%  
- Mini sparkline 14 días  
- Cocina en cola: 7 · Mesas ocupadas: 9  

---

## 4. Imagen hero / atmósfera (equivalente al perro+gato)

**No** usar mascotas. Usar fotografía de **restaurante peruano / comida / servicio**:

Opciones (elegir 1 dominante):

1. Plato estrella (lomo saltado / ceviche) en primer plano, mesa de restaurante desenfocada.  
2. Mesero en salón con tablet (PWA), ambiente cálido.  
3. Barra / cocina a fuego, platos saliendo.  

Overlay: collage de cards UI semitransparentes / con sombra, **sin** tapar el plato/rostro del servicio.

---

## 5. Layout del flyer (estructura VetSaaS)

```
┌─────────────────────────────────────┐
│  [Collage UI + foto restaurante]   │  ~55–60% altura
│   sidebar + 4–6 cards flotantes     │
├─────────────────────────────────────┤
│  Fondo brand #660033 (oscuro)       │  ~40–45%
│                                     │
│  FoodSaaS: Gestión integral         │
│  para tu restaurante                │
│                                     │
│  Un sistema todo en uno para…       │
│  (2–3 líneas)                       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Asesoría Gratuita:          │    │
│  │ 🟢 WhatsApp 976 809 804     │    │
│  │ orvae.pe                    │    │
│  └─────────────────────────────┘    │
│                        [Logo Orvae] │
└─────────────────────────────────────┘
```

**Formatos**

| Uso | Ratio | px sugeridos |
|-----|-------|--------------|
| Feed IG / FB | 4:5 | 1080×1350 |
| Story / Reels cover | 9:16 | 1080×1920 |
| LinkedIn / web | 1.91:1 | 1200×628 |
| Flyer print A5 | — | 148×210 mm @ 300dpi |

---

## 6. Mensajes clave (bullets de venta)

Usar máximo 5 en el diseño; el resto para caption del post.

1. **Sala → cocina → caja → SUNAT** en un flujo continuo.  
2. **Facturación electrónica** (boleta/factura) integrada al cobro.  
3. **PWA** para mesero y cocina (celular/tablet).  
4. **Multi-sede** y permisos por rol (cajero, mesero, cocina, gerente).  
5. **Delivery + reservas** en el mismo sistema.  
6. **Insumos, recetas y foodcost** (planes superiores).  
7. **Compras / OC** y kardex.  
8. **Reportes** del día/turno y export.  
9. Alta desde **Orvae** (checkout) · soporte en español Perú.

---

## 7. Caption listo para pegar (redes)

```
FoodSaaS: gestión integral para tu restaurante 🍽️

Salón, pedidos, cocina, caja, carta, almacén, delivery,
reservas y facturación electrónica SUNAT — en un solo sistema.

✅ Cobro con boleta/factura
✅ PWA mesero y cocina
✅ Multi-sede y roles
✅ Reportes del turno

Asesoría gratuita:
WhatsApp 976 809 804
orvae.pe

#FoodSaaS #Orvae #RestaurantesPerú #SUNAT #POS
```

---

## 8. Prompt listo para generador de imagen (IA)

Copiar/pegar y ajustar:

```
Create a professional SaaS marketing flyer for "FoodSaaS" by Orvae Software Development, matching the layout style of a VetSaaS promo poster: top 55% is a photo collage of a Peruvian restaurant atmosphere (ceviche or lomo saltado plate + warm dining room) with floating UI dashboard cards overlaid (salon floor plan with tables, kitchen KDS queue, open cash register with PEN totals, electronic invoice SUNAT list, POS charge screen). UI uses burgundy brand color #660033, white cards, soft shadows, Instrument Sans-like UI. Left edge shows a light sidebar with FoodSaaS logo and menu items Dashboard, Carta, Salón, Pedidos, Cocina, Caja, Ventas, Facturación. Bottom 45% is solid dark burgundy #660033 with large white headline "FoodSaaS: Gestión integral para tu restaurante", short supporting text in Spanish about salon, kitchen, cash, inventory, delivery, reservations and electronic billing SUNAT, then a rounded light CTA box "Asesoría Gratuita:" with WhatsApp icon and number 976809804 plus orvae.pe. Small Orvae Software Development logo bottom-right. Clean, premium, no purple gradients, no cartoon pets, no cluttered text. Vertical 4:5 social post.
```

### Prompt EN corto (si el modelo responde mejor en inglés)

Same structure; keep **Spanish** strings in the flyer text exactly as in §2.

---

## 9. Checklist de entrega

- [ ] Brand `#660033` dominante (no teal VetSaaS)  
- [ ] Headline + subcopy ES correctos  
- [ ] CTA WhatsApp **976 809 804** + orvae.pe  
- [ ] Logo Orvae visible  
- [ ] Al menos 4 cards UI reconocibles (Salón, Cocina, Caja, FEL)  
- [ ] Foto de restaurante/comida (no stock genérico de laptop)  
- [ ] Texto legible a tamaño Story (mín. ~24px efectivo en 1080w)  
- [ ] Versión 4:5 + opcional 9:16  

---

## 10. Fuentes internas del producto

Para actualizar este brief cuando cambie el producto:

| Recurso | Path |
|---------|------|
| Visión / módulos | `docs/FOODSAAS-SAAS-VISION.md` |
| Design system | `DESIGN.md` |
| Nav i18n | `resources/js/lang/es/nav.json` |
| Tokens CSS | `resources/css/app.css` (`--brand-600`) |
| Demo URL | `.env.example` → `FOODSAAS_DEMO_URL` |

---

*Última actualización: nov 2026 — alineado a Fase A cerrada + Fase B (recetas, compras, descuentos gerente, realtime, dashboards).*
