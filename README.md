# Mimi Pastel · Sistema de gestión

Producción, despacho, ventas, caja y utilidad diaria para la pastelería Mimi Pastel.

**Stack:** Next.js 15 · React 19 · Supabase (Postgres + Auth + RLS) · GitHub

---

## Qué hace hoy

| Pantalla | Para quién | Qué registra |
|---|---|---|
| **Hoy** | Dueña | Utilidad del día, ventas por canal, diferencias de cuadre, pedidos pendientes |
| **Programar** | Dueña | Parrilla cliente × producto (como la hoja SGMP), con totales y copia del día anterior |
| **Producción** | Personal de taller | Requerimiento del día, lote producido con su costo, mermas |
| **Ventas** | Vendedoras | Conteo ciego de lo recibido, vendido, sobrantes, mermas y dinero (efectivo / Yape / transferencia) |
| **Pedidos** | Dueña / ventas | Cliente, fecha de entrega, precio propio por pedido, paso al requerimiento |
| **Ajustes** | Dueña | Productos, precios por canal, usuarios |

## El motor de cuadre

```
sobrante_ayer + enviado − vendido − sobrante_hoy − merma = diferencia
```

Si la diferencia no es 0, la pantalla **Hoy** dice exactamente qué producto y en qué punto de venta falta.

Y la utilidad:

```
utilidad = ventas − costo de lo vendido − gastos del negocio − merma valorizada
```

Los retiros, gastos personales y préstamos **no** restan utilidad: mueven caja, no ganancia.

---

## Cómo correrlo

```bash
# 1. dependencias
pnpm install

# 2. variables de entorno
cp .env.example .env.local     # y completa los valores

# 3. desarrollo
pnpm dev                        # http://localhost:3000

# 4. producción
pnpm build && pnpm start
```

## Base de datos

Las migraciones están en `supabase/migrations/` y se aplican con:

```bash
node scripts/apply-sql.mjs supabase/migrations/0001_schema.sql \
                          supabase/migrations/0002_rls.sql \
                          supabase/migrations/0003_seed.sql \
                          supabase/migrations/0004_vistas.sql
```

Requiere en `.env.local`:

```
SUPABASE_PROJECT_REF=...
SUPABASE_ACCESS_TOKEN=sbp_...
```

> El script divide el SQL en sentencias respetando bloques `$$`, comillas y comentarios,
> porque la Management API rechaza ciertos lotes.

## Prueba del motor

```bash
node scripts/run-sql.mjs supabase/tests/smoke_cuadre.sql
```

Debe devolver `diferencia = 0` en unidades y dinero, y `utilidad = 17.50`.

---

## Roles

| Rol | Ve | Escribe |
|---|---|---|
| `admin` | todo | todo |
| `produccion` | requerimiento, productos | lotes, insumos, mermas de producción, despachos |
| `ventas` | productos, precios | ventas, pagos, sobrantes, mermas de vitrina, cuadre |

Las reglas viven en la base de datos (RLS), no en la pantalla.

## Estructura

```
app/            pantallas (Next.js App Router)
components/     Shell con navegación y sesión
lib/            cliente Supabase y utilidades
supabase/       migraciones y pruebas SQL
scripts/        aplicador de migraciones
docs/           planteamiento funcional
```

## Pendiente (siguiente fase)

- [ ] Costos por receta (consumo automático de insumos)
- [ ] Despacho desde producción (hoy el envío se registra al recibir)
- [ ] Caja completa con categorías y conciliación
- [ ] Dashboard con comparación entre periodos
- [ ] Alta de usuarios desde la app
- [ ] PWA instalable + modo offline
