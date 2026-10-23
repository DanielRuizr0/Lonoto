export async function subirImagenGaleria(supabase, file, ruta) {
  const { error } = await supabase.storage
    .from('galerias_pedidos')
    .upload(ruta, file, { contentType: file.type, upsert: false });

  if (error) {
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error(
        'No existe el bucket privado galerias_pedidos en Supabase. Aplica la migración ' +
        'supabase/migrations/20261021150000_galerias_privadas_pedidos.sql y vuelve a intentarlo.'
      );
    }
    throw error;
  }
  return ruta;
}

export async function crearGaleriaPrivadaPedido(supabase, pedido) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const { error } = await supabase.functions.invoke('pedido-galeria', {
    body: {
      accion: 'crear',
      token,
      pedido
    }
  });
  if (error) throw error;

  const enlaceGaleria = new URL('../paginas/galeria-pedido.html', import.meta.url);
  enlaceGaleria.searchParams.set('token', token);
  return enlaceGaleria.href;
}
