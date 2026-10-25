"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import RecetasAdmin from "@/components/RecetasAdmin";
import RegistroProduccion from "@/components/RegistroProduccion";
import CostosAdmin from "@/components/CostosAdmin";
import InsumosProduccion from "@/components/InsumosProduccion";
import { hoyISO } from "@/lib/supabase";
import { supabase, soles } from "@/lib/supabase";

type Prod = { id: string; nombre: string; codigo: string | null; unidad: string; activo: boolean };
type Punto = { id: string; codigo: string; nombre: string; tipo: string; es_fijo: boolean };
type Precio = { id: string; producto_id: string; punto_venta_id: string | null; precio: number };
type Perfil = { id: string; nombre: string; rol: string };

export default function AdminPage() {
  return (
    <Shell>
      <Contenido />
    </Shell>
  );
}

function Contenido() {
  const [productos, setProductos] = useState<Prod[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [unidad, setUnidad] = useState("unidad");

  const [precioProd, setPrecioProd] = useState("");
  const [precioPunto, setPrecioPunto] = useState("");
  const [precioValor, setPrecioValor] = useState("");
  const [promos, setPromos] = useState<any[]>([]);
  const [promoNombre, setPromoNombre] = useState("");
  const [promoCant, setPromoCant] = useState("3");
  const [promoPrecio, setPromoPrecio] = useState("");
  const [promoProds, setPromoProds] = useState<string[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [insumoNombre, setInsumoNombre] = useState("");
  const [insumoUnidad, setInsumoUnidad] = useState("kg");

  const cargar = useCallback(async () => {
    const [p, pv, pr, pf, pm, ins] = await Promise.all([
      supabase.from("productos").select("id, nombre, codigo, unidad, activo, orden").order("orden", { ascending: true }),
      supabase.from("puntos_venta").select("id, codigo, nombre, tipo, es_fijo, orden").order("orden", { ascending: true }).order("codigo"),
      supabase.from("precios").select("id, producto_id, punto_venta_id, precio"),
      supabase.from("perfiles").select("id, nombre, rol").order("nombre"),
      supabase.from("promociones").select("id, nombre, cantidad, precio, activo, promocion_productos(producto_id)").order("creado_en"),
      supabase.from("insumos").select("id, nombre, unidad_base, precio_unitario, activo").order("nombre"),
    ]);
    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);
    setPrecios((pr.data ?? []) as Precio[]);
    setPerfiles((pf.data ?? []) as Perfil[]);
    setPromos((pm.data ?? []) as any[]);
    setInsumos((ins.data ?? []) as any[]);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crearProducto(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!nombre.trim()) return setErr("Falta el nombre del producto.");
    const { error } = await supabase.from("productos").insert({
      nombre: nombre.trim(),
      codigo: codigo.trim() || null,
      unidad,
    });
    if (error) return setErr(error.message);
    setNombre("");
    setCodigo("");
    setMsg("Producto creado.");
    cargar();
  }

  async function alternarFijo(p: Punto) {
    await supabase.from("puntos_venta").update({ es_fijo: !p.es_fijo }).eq("id", p.id);
    cargar();
  }

  async function alternarActivo(p: Prod) {
    await supabase.from("productos").update({ activo: !p.activo }).eq("id", p.id);
    cargar();
  }

  async function crearPrecio(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!precioProd || !precioValor) return setErr("Elige producto e indica el precio.");
    const { error } = await supabase.from("precios").insert({
      producto_id: precioProd,
      punto_venta_id: precioPunto || null,
      precio: Number(precioValor),
    });
    if (error) return setErr(error.message);
    setPrecioValor("");
    setMsg("Precio registrado.");
    cargar();
  }

  async function crearInsumo(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!insumoNombre.trim()) return setErr("Falta el nombre del insumo.");
    const { error } = await supabase
      .from("insumos")
      .insert({ nombre: insumoNombre.trim(), unidad_base: insumoUnidad });
    if (error) return setErr(error.message);
    setInsumoNombre("");
    setMsg("Insumo creado.");
    cargar();
  }

  async function guardarPrecioInsumo(id: string, valor: string) {
    const precio = Number(valor || 0);
    await supabase.from("insumos").update({ precio_unitario: precio }).eq("id", id);
    cargar();
  }

  async function crearPromo(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!promoNombre.trim()) return setErr("Falta el nombre de la promoción.");
    if (promoProds.length === 0) return setErr("Elige al menos un producto.");

    const { data, error } = await supabase
      .from("promociones")
      .insert({
        nombre: promoNombre.trim(),
        cantidad: Number(promoCant || 1),
        precio: Number(promoPrecio || 0),
        activo: true,
      })
      .select("id")
      .single();

    if (error || !data) return setErr(error?.message ?? "No se pudo crear");

    const { error: e2 } = await supabase.from("promocion_productos").insert(
      promoProds.map((pid) => ({ promocion_id: data.id, producto_id: pid })),
    );
    if (e2) return setErr(e2.message);

    setPromoNombre("");
    setPromoPrecio("");
    setPromoProds([]);
    setMsg("Promoción creada.");
    cargar();
  }

  async function alternarPromo(id: string, activo: boolean) {
    await supabase.from("promociones").update({ activo: !activo }).eq("id", id);
    cargar();
  }

  function toggleProd(id: string) {
    setPromoProds((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));
  }

  const nombreProd = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "—";
  const codigoPunto = (id: string | null) => (id ? puntos.find((p) => p.id === id)?.codigo ?? "—" : "General");

  return (
    <>
      <h1>Ajustes</h1>
      <p className="sub">Productos, precios y usuarios</p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <form className="card" onSubmit={crearProducto}>
        <h2>Nuevo producto</h2>
        <div className="grid grid-3">
          <div className="field">
            <label className="f">Nombre</label>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Torta de chocolate" />
          </div>
          <div className="field">
            <label className="f">Código</label>
            <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="field">
            <label className="f">Unidad</label>
            <select className="input" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              <option value="unidad">Unidad</option>
              <option value="porcion">Porción</option>
              <option value="kg">Kilo</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary">Crear producto</button>
      </form>

      <div className="card">
        <h2>Productos ({productos.length})</h2>
        {productos.length === 0 ? (
          <p className="empty">Aún no hay productos.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código</th>
                  <th>Unidad</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{p.codigo ?? "—"}</td>
                    <td>{p.unidad}</td>
                    <td>
                      <span className={`badge ${p.activo ? "ok" : "neutral"}`}>{p.activo ? "activo" : "inactivo"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm" onClick={() => alternarActivo(p)}>
                        {p.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form className="card" onSubmit={crearPrecio}>
        <h2>Nuevo precio</h2>
        <div className="grid grid-3">
          <div className="field">
            <label className="f">Producto</label>
            <select className="input" value={precioProd} onChange={(e) => setPrecioProd(e.target.value)}>
              <option value="">—</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="f">Canal</label>
            <select className="input" value={precioPunto} onChange={(e) => setPrecioPunto(e.target.value)}>
              <option value="">General</option>
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="f">Precio (S/)</label>
            <input className="input num" type="number" min="0" step="0.1" value={precioValor} onChange={(e) => setPrecioValor(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary">Registrar precio</button>
      </form>

      <div className="card">
        <h2>Precios vigentes</h2>
        {precios.length === 0 ? (
          <p className="empty">Sin precios registrados.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Canal</th>
                  <th className="num">Precio</th>
                </tr>
              </thead>
              <tbody>
                {precios.map((p) => (
                  <tr key={p.id}>
                    <td>{nombreProd(p.producto_id)}</td>
                    <td>{codigoPunto(p.punto_venta_id)}</td>
                    <td className="num">{soles(p.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Puntos de venta y clientes</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Los fijos aparecen siempre en la parrilla de programación (lunes a viernes).
          Los eventuales solo cuando activas «mostrar eventuales».
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Programación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {puntos.map((pv) => (
                <tr key={pv.id}>
                  <td><strong>{pv.codigo}</strong></td>
                  <td>{pv.nombre}</td>
                  <td>{pv.tipo}</td>
                  <td>
                    <span className={`badge ${pv.es_fijo ? "ok" : "neutral"}`}>
                      {pv.es_fijo ? "fijo" : "eventual"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm" onClick={() => alternarFijo(pv)}>
                      {pv.es_fijo ? "Marcar eventual" : "Marcar fijo"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Insumos y precios</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          El precio por unidad base (kg, litro, unidad) sirve para valorizar el consumo diario.
        </p>

        <form onSubmit={crearInsumo}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Nombre</label>
              <input className="input" value={insumoNombre} onChange={(e) => setInsumoNombre(e.target.value)} placeholder="Masa, fruta, manjar…" />
            </div>
            <div className="field">
              <label className="f">Unidad</label>
              <select className="input" value={insumoUnidad} onChange={(e) => setInsumoUnidad(e.target.value)}>
                <option value="kg">Kilo</option>
                <option value="l">Litro</option>
                <option value="unidad">Unidad</option>
                <option value="balon">Balón</option>
              </select>
            </div>
          </div>
          <button className="btn btn-sm">Agregar insumo</button>
        </form>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Unidad</th>
                <th className="num">Precio por unidad</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => (
                <tr key={i.id}>
                  <td>{i.nombre}</td>
                  <td>{i.unidad_base}</td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={Number(i.precio_unitario ?? 0)}
                      onBlur={(e) => guardarPrecioInsumo(i.id, e.target.value)}
                      style={{ width: 100, padding: "6px 8px" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RecetasAdmin productos={productos} />

      <CostosAdmin />

      <RegistroProduccion productos={productos} />

      <InsumosProduccion fecha={hoyISO()} />


      <div className="card">
        <h2>Promociones</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Se pueden combinar productos distintos: 2 empanadas de carne + 1 de pollo cuentan como 3.
        </p>

        <form onSubmit={crearPromo}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Nombre</label>
              <input className="input" value={promoNombre} onChange={(e) => setPromoNombre(e.target.value)} placeholder="3 pasteles por S/ 5" />
            </div>
            <div className="field">
              <label className="f">Cantidad</label>
              <input className="input num" type="number" min="1" step="1" value={promoCant} onChange={(e) => setPromoCant(e.target.value)} />
            </div>
            <div className="field">
              <label className="f">Precio promo (S/)</label>
              <input className="input num" type="number" min="0" step="0.1" value={promoPrecio} onChange={(e) => setPromoPrecio(e.target.value)} />
            </div>
          </div>

          <label className="f">Productos que participan</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {productos.map((pr) => (
              <button
                key={pr.id}
                type="button"
                className="btn btn-sm"
                onClick={() => toggleProd(pr.id)}
                style={
                  promoProds.includes(pr.id)
                    ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                    : undefined
                }
              >
                {pr.codigo ?? pr.nombre}
              </button>
            ))}
          </div>

          <button className="btn btn-primary">Crear promoción</button>
        </form>

        {promos.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Promoción</th>
                  <th className="num">Lleva</th>
                  <th className="num">Paga</th>
                  <th>Productos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {promos.map((pm) => (
                  <tr key={pm.id}>
                    <td>{pm.nombre}</td>
                    <td className="num">{Number(pm.cantidad)}</td>
                    <td className="num">{soles(pm.precio)}</td>
                    <td>
                      {(pm.promocion_productos ?? [])
                        .map((x: any) => {
                          const pr = productos.find((y) => y.id === x.producto_id);
                          return pr?.codigo ?? "?";
                        })
                        .join(", ")}
                    </td>
                    <td>
                      <span className={`badge ${pm.activo ? "ok" : "neutral"}`}>
                        {pm.activo ? "activa" : "inactiva"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm" onClick={() => alternarPromo(pm.id, pm.activo)}>
                        {pm.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Usuarios</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {perfiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>
                    <span className="badge neutral">{p.rol}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sub" style={{ marginTop: 12 }}>
          Para crear usuarios de producción o ventas se usa Supabase → Authentication → Users, y luego
          se asigna el rol en la tabla <code>perfiles</code>.
        </p>
      </div>
    </>
  );
}
