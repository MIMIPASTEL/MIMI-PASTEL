# Mimi Pastel — Planteamiento: Producción, Despacho, Ventas y Ganancia Diaria

> Documento de diseño funcional y de datos. Base para construir la app web (Next.js + Supabase).
> Inspirado en el ciclo clásico de un ERP de alimentos (tipo a3ERP / Odoo): **Pedido → Requerimiento → Orden de producción → Consumo de insumos → Merma → Despacho → Venta → Cuadre → Rentabilidad**.

---

## 1. Principio rector

Todo gira alrededor de **un día operativo** (fecha + turno) y de **unidades de producto trazables**.

Un pastel no es "un número en una celda": es una unidad que nace en un **lote de producción**, viaja a un **punto de venta**, y termina en uno de cuatro estados:

| Estado | Significado |
|---|---|
| **Vendido** | Se cobró |
| **Sobrante** | Regresa apto y pasa al día siguiente |
| **Merma** | Roto, quemado, vencido, contaminado |
| **Enviado y no cuadrado** | Faltante → alerta roja |

Con esa trazabilidad, el dinero **tiene** que cuadrar con los productos. Sin ella, cualquier cuadre es una opinión.

---

## 2. Flujo diario (7 pasos)

| # | Paso | Quién | Qué registra |
|---|---|---|---|
| 1 | **Pedidos** | Tú / ventas | Cliente, fecha de entrega, productos, cantidades, **precio de ese pedido**, adelanto |
| 2 | **Requerimiento** | Tú | Cuánto producir por producto y **por destino** (MAXI1, MAXI2, repartos, pedido X) |
| 3 | **Producción** | Personal de producción (celular) | Ve el requerimiento; registra **insumos usados**, **mermas de producción**, y **total producido por destino** |
| 4 | **Despacho** | Producción → Ventas | Se envía y se **recibe con conteo** (conteo ciego) |
| 5 | **Venta** | Vendedora (celular, 3 toques) | Sobrantes devueltos, mermas de vitrina, **efectivo contado** + **Yape/transferencias** |
| 6 | **Cuadre** | Sistema (automático) | Compara unidades y dinero; marca verde / ámbar / rojo |
| 7 | **Cierre del día** | Tú | Utilidad del día, diferencias, alertas, resumen |

El requerimiento se alimenta de **tres fuentes**: (a) pedidos confirmados, (b) histórico de ventas del mismo día de la semana, (c) ajuste manual tuyo. Nunca se teclea dos veces.

---

## 3. Las cuatro identidades de cuadre

### 3.1 Por unidades (por producto, por punto de venta)

```
sobrante_ayer + enviado_hoy − vendido − sobrante_hoy − merma = 0
```

Cada término es un número que alguien contó. Si la resta no da 0, el sistema dice exactamente **qué producto y cuántas unidades** faltan o sobran.

### 3.2 Por dinero

```
Σ (cantidad_vendida × precio_de_esa_línea) = efectivo + yape + transferencia + fiado
```

El precio **no** se guarda en el producto: se guarda **en cada línea de venta**. Es la única forma de soportar que el precio varíe por pedido.

### 3.3 Por despacho

```
Σ despacho_items = Σ requerimiento_items (o diferencia justificada)
```

### 3.4 Por insumos

```
consumo_teórico (según receta) vs consumo_real (lo que el personal declaró)
→ diferencia = desperdicio no registrado o receta mal calibrada
```

Esta última es la que te va a revelar plata: si declaras 10 kg de harina y la receta dice 8, o hay merma no registrada o alguien se está llevando insumos.

---

## 4. Ganancia diaria: la definición correcta

Tu pregunta ("cuánto es mi ganancia diaria") tiene **dos respuestas válidas y distintas**. Mezclarlas es el error más común y el que hace que un negocio rentable se sienta pobre (o al revés).

### 4.1 Utilidad del día (¿el negocio gana?)

```
Utilidad = Ventas del día (devengado)
         − Costo de lo vendido (COGS del lote que se vendió)
         − Gastos del negocio del día
```

- El costo de lo vendido usa el **costo unitario del lote**, aunque el pastel se haya producido ayer.
- Un sobrante que se vende hoy aporta ingreso hoy, pero su costo ya se cargó ayer → **no se vuelve a costear** (resuelve el doble costeo que pediste evitar).

### 4.2 Resultado de caja (¿hay dinero?)

```
Caja = cobros del día (incluye adelantos) − pagos del día
```

### 4.3 La distinción que te falta hoy

En tu caja actual conviven gastos del negocio con **gastos personales, retiros y préstamos**. Contablemente:

- **Gasto del negocio** → baja la utilidad.
- **Retiro de la dueña** → NO es gasto: es distribución de utilidad. Baja el efectivo disponible, no la ganancia.
- **Préstamo recibido** → NO es ingreso: es deuda. Sube la caja, no la utilidad.

Si no se separan, tu "ganancia" es un número que no significa nada. La app los separa por categoría y muestra ambos tableros.

### 4.4 Pantalla de cierre diario (lo que verás)

```
VENTAS DEL DÍA            S/ 1,240.00
(−) Costo de lo vendido   S/   520.00   → Margen bruto 58%
(−) Gastos del negocio    S/    85.00
(−) Mermas valorizadas    S/    30.00
─────────────────────────────────────
UTILIDAD DEL DÍA          S/   605.00

CAJA: entradas S/ 1,240 · salidas S/ 210 · saldo S/ 1,030
Diferencias de cuadre: MAXI1 −S/ 12.00 · MAXI2 S/ 0.00
```

---

## 5. Roles y pantallas

### 5.1 Producción (celular, una sola pantalla con pestañas)

1. **Requerimiento de hoy** — lista corta: producto, cantidad, destino. Incluye los pedidos con su cliente y hora de entrega, resaltados.
2. **Producido** — botón `+`/`−` por producto y destino. Sin teclado numérico salvo excepción.
3. **Insumos usados** — precargado desde la receta (ej. 60 pasteles → 12 kg harina). El personal solo corrige si se usó otra cosa.
4. **Merma** — cantidad + motivo (roto / quemado / vencido / contaminado) + foto opcional.
5. **Cerrar producción** — bloquea y avisa si falta registrar algo.

### 5.2 Ventas (celular, máximo 3 pasos)

1. **Recibí** — conteo ciego: la vendedora ingresa lo que contó, **sin ver lo que el sistema espera**.
2. **Sobrantes y mermas** — cuántos regresan aptos y cuántos se rompieron.
3. **Dinero** — efectivo contado + Yape + transferencias (con número de operación opcional).

Al final ve el semáforo. Si falta dinero, el sistema no la deja "arreglarlo": solo puede **justificar** con una nota que tú apruebas.

### 5.3 Administración (tú)

Requerimiento, precios, pedidos, cuadre, utilidad del día, dashboard, alertas, cierre y bloqueo.

---

## 6. Modelo de datos (tablas núcleo)

```
puntos_venta        (id, nombre, tipo)               -- MAXI1, MAXI2, REPARTOS, PEDIDOS
productos           (id, nombre, unidad, activo)
precios             (producto_id, punto_venta_id, precio, vigente_desde)
recetas             (id, producto_id, version, vigente_desde)
receta_items        (receta_id, insumo_id, cantidad)
insumos             (id, nombre, unidad_base, stock_minimo)

pedidos             (id, cliente, fecha_entrega, hora, canal, estado, adelanto, observacion)
pedido_items        (pedido_id, producto_id, cantidad, precio_unitario)   -- precio propio

requerimientos      (id, fecha, estado, creado_por)
requerimiento_items (id, requerimiento_id, producto_id, cantidad,
                     destino_punto_id, destino_pedido_id, origen)          -- estimado | pedido

lotes_produccion    (id, fecha, producto_id, cantidad, costo_insumos,
                     costo_mano_obra, costo_unitario, lote_padre_id)       -- lote_padre = sobrante
consumos_insumo     (id, lote_id, insumo_id, cantidad, costo_unitario)
mermas              (id, fecha, producto_id, lote_id, cantidad, tipo,
                     motivo, foto_url, usuario_id, aprobado_por)

despachos           (id, fecha, punto_venta_id, estado)
despacho_items      (despacho_id, producto_id, cantidad_enviada, cantidad_recibida)
sobrantes_iniciales (fecha, punto_venta_id, producto_id, cantidad, lote_id)

ventas              (id, fecha, punto_venta_id, turno, usuario_id, total)
venta_items         (venta_id, producto_id, cantidad, precio_unitario, lote_id)
pagos               (id, venta_id, punto_venta_id, medio, monto, referencia)

movimientos_caja    (id, fecha, tipo, categoria, monto, medio, turno,
                     vendedora, concepto, afecta_utilidad)                 -- bool clave
cuadres             (fecha, punto_venta_id, dif_unidades, dif_dinero, estado)

usuarios            (id, nombre, rol)  -- admin | produccion | ventas
auditoria           (tabla, registro_id, accion, usuario_id, datos, fecha)
```

**Decisiones de modelado que importan:**

- `venta_items.precio_unitario` — el precio vive en la línea, no en el producto. Soporta pedidos con precio especial.
- `movimientos_caja.afecta_utilidad` — separa gasto de negocio de retiro/préstamo/adelanto.
- `lotes_produccion.lote_padre_id` — el sobrante hereda el lote y el costo; no se re-costea.
- `recetas.version` — si cambia la receta, los costos históricos no se reescriben.

---

## 7. Reglas anti-error y anti-fraude

1. **Conteo ciego** en ventas: la vendedora no ve lo esperado. Sin esto, el cuadre siempre "da bien" y no sirve.
2. **Cierre de turno obligatorio**: no se cierra el día siguiente sin cerrar el anterior (queda en estado *pendiente* y te alerta).
3. **Merma con motivo y umbral**: si la merma supera el 3% de lo enviado, requiere tu aprobación.
4. **Alertas de margen negativo**: si el precio de una línea es menor al costo del lote, salta antes de confirmar el pedido.
5. **Precio mínimo por producto**: no se puede vender por debajo sin autorización.
6. **Trazabilidad desde el día uno**: `usuario_id` y fecha en cada registro (en Supabase es gratis, no lo dejes "para después").
7. **Auditoría inmutable**: quién modificó un cierre ya no puede borrarlo, solo corregirlo con un asiento de ajuste.

---

## 8. Mejoras que propongo (por prioridad)

| # | Mejora | Por qué |
|---|---|---|
| 1 | **Separar gasto de negocio / retiro / préstamo** | Tu ganancia actual está distorsionada |
| 2 | **Conteo ciego en ventas** | Es la única forma de que el cuadre detecte faltantes reales |
| 3 | **Costo por lote con herencia en sobrantes** | Elimina el doble costeo de raíz |
| 4 | **Requerimiento sugerido por histórico** | Menos merma por sobreproducción; se ajusta con tu criterio |
| 5 | **Precio por línea + alerta de margen** | Descubres qué pedido te hace perder plata |
| 6 | **Merma con foto y aprobación** | Reduce el "se rompió" sin evidencia |
| 7 | **Cierre diario con resumen por WhatsApp** | Tú no estás en el taller; el resumen te llega |
| 8 | **PWA instalable + modo offline** | Si falla el internet, la venta no se detiene |
| 9 | **Etiquetas/QR por lote** | Conteo rápido en vitrina (fase 2) |
| 10 | **Antigüedad de deudas y adelantos** | Sabes cuánto te deben y cuánto reservar para SUNAT |

---

## 9. Fases

| Fase | Contenido | Resultado |
|---|---|---|
| **1** | Requerimiento + producción + merma de producción | El taller registra desde el celular |
| **2** | Despacho + ventas + cuadre + caja | El dinero cuadra con lo enviado |
| **3** | Costos por lote + recetas + utilidad diaria | Sabes cuánto ganas de verdad |
| **4** | Pedidos con precio propio + adelantos | Los pedidos entran solos al requerimiento |
| **5** | Dashboard + alertas + histórico | Decides con indicadores, no con sensación |

---

## 10. Preguntas abiertas

1. ¿Controlas por **unidad** o hay productos por **peso/porción** (tortas, postres)?
2. ¿Los precios cambian por **canal** (MAXIAHORRO vs. pedido) o solo por pedido puntual?
3. ¿Manejas **fiado / pago posterior** en algún canal?
4. ¿Cuántas vendedoras y cuántos turnos exactamente?
5. ¿La merma se descuenta del sueldo o solo se registra?
