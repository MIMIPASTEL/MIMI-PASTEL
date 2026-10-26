"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, soles } from "@/lib/supabase";

type Fila = {
  presentacion_id: string;
  producto_id: string;
  producto: string;
  presentacion: string;
  directo: string;
  distribuidor: string;
  _orden: number;
};

export default function PreciosCliente() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [pr, pc] = await Promise.all([
      supabase
        .from("presentaciones")
        .select("id, nombre, orden, producto_id, productos(codigo, orden)")
        .order("orden"),
      supabase.from("precios_cliente").select("presentacion_id, tipo_cliente, precio"),
    ]);

    const precios: Record<string, any> = {};
    (pc.data ?? []).forEach((p: any) => {
      precios[p.presentacion_id] = precios[p.presentacion_id] ?? {};
      precios[p.presentacion_id][p.tipo_cliente] = Number(p.precio);
    });

    const lista: Fila[] = ((pr.data ?? []) as any[])
      .map((p) => ({
        presentacion_id: p.id,
        producto_id: p.producto_id,
        producto: p.productos?.codigo ?? "",
        presentacion: p.nombre,
        directo: precios[p.id]?.directo !== undefined ? String(precios[p.id].directo) : "",
        distribuidor:
          precios[p.id]?.distribuidor !== undefined ? String(precios[p.id].distribuidor) : "",
        _orden: p.productos?.orden ?? 0,
      }))
      .sort((a, b) => a._orden - b._orden || a.producto.localeCompare(b.producto));

    setFilas(lista);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(f: Fila, tipo: "directo" | "distribuidor", valor: string) {
    setErr(null);
    setMsg(null);
    const precio = Number(valor || 0);
    const { error } = await supabase.from("precios_cliente").upsert(
      {
        producto_id: f.producto_id,
        presentacion_id: f.presentacion_id,
        tipo_cliente: tipo,
        precio,
      },
      { onConflict: "producto_id,presentacion_id,tipo_cliente" },
    );
    if (error) setErr(error.message);
    else setMsg(`Guardado: ${f.producto} · ${f.presentacion} · ${tipo} = ${soles(precio)}`);
  }

  return (
    <div className="card">
      <h2>Precios por tipo de cliente</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Precio directo (cliente final) y precio distribuidor. Los queques y la torta de chocolate
        tienen además tajada y molde entero.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Presentación</th>
              <th className="num">Directo</th>
              <th className="num">Distribuidor</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.presentacion_id}>
                <td>{f.producto}</td>
                <td>{f.presentacion}</td>
                <td className="num">
                  <input
                    className="input num"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={f.directo}
                    onBlur={(e) => guardar(f, "directo", e.target.value)}
                    style={{ width: 84, padding: "6px 8px" }}
                  />
                </td>
                <td className="num">
                  <input
                    className="input num"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={f.distribuidor}
                    onBlur={(e) => guardar(f, "distribuidor", e.target.value)}
                    style={{ width: 84, padding: "6px 8px" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
        Se guarda al salir de cada casilla. En Pedidos el precio se carga solo según el tipo de
        cliente y la presentación.
      </p>
    </div>
  );
}
