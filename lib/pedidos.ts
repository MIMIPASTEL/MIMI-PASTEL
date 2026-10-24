import { supabase } from "./supabase";

/**
 * Vuelca los productos de un pedido al requerimiento de producción
 * de su fecha de entrega. Idempotente: borra lo anterior de ese pedido
 * y vuelve a insertar, así se puede llamar cuantas veces haga falta.
 */
export async function sincronizarPedido(
  pedidoId: string,
  usuarioId?: string,
): Promise<{ error: string | null; insertados: number }> {
  const { data: ped } = await supabase
    .from("pedidos")
    .select("id, fecha_entrega, estado")
    .eq("id", pedidoId)
    .maybeSingle();

  if (!ped) return { error: "Pedido no encontrado", insertados: 0 };
  if (ped.estado === "cancelado") {
    await quitarPedidoDeProduccion(pedidoId);
    return { error: null, insertados: 0 };
  }

  const { data: items } = await supabase
    .from("pedido_items")
    .select("producto_id, cantidad")
    .eq("pedido_id", pedidoId);

  if (!items || items.length === 0) return { error: null, insertados: 0 };

  // 1. requerimiento de la fecha de entrega
  let reqId: string | null = null;
  const { data: req } = await supabase
    .from("requerimientos")
    .select("id")
    .eq("fecha", ped.fecha_entrega)
    .maybeSingle();

  if (req) {
    reqId = req.id;
  } else {
    const { data: nuevo, error } = await supabase
      .from("requerimientos")
      .insert({ fecha: ped.fecha_entrega, estado: "publicado", creado_por: usuarioId })
      .select("id")
      .single();
    if (error) {
      const { data: ex } = await supabase
        .from("requerimientos")
        .select("id")
        .eq("fecha", ped.fecha_entrega)
        .maybeSingle();
      if (!ex) return { error: error.message, insertados: 0 };
      reqId = ex.id;
    } else {
      reqId = nuevo.id;
    }
  }

  // 2. reemplazar lo que aporta este pedido
  await supabase
    .from("requerimiento_items")
    .delete()
    .eq("destino_pedido_id", pedidoId);

  const { error: e2 } = await supabase.from("requerimiento_items").insert(
    items.map((i: any) => ({
      requerimiento_id: reqId,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      destino_pedido_id: pedidoId,
      origen: "pedido",
    })),
  );

  return { error: e2?.message ?? null, insertados: items.length };
}

/** Quita el aporte del pedido al requerimiento (sin borrar el pedido). */
export async function quitarPedidoDeProduccion(pedidoId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("requerimiento_items")
    .delete()
    .eq("destino_pedido_id", pedidoId);
  return { error: error?.message ?? null };
}
