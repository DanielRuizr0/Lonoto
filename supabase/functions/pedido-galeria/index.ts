import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store'
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const OBJECT_PATTERN = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|jpeg|png|webp)$/i;
const BUCKET = 'galerias_pedidos';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function validarPedido(pedido: unknown) {
  if (!pedido || typeof pedido !== 'object' || Array.isArray(pedido)) {
    throw new Error('El pedido enviado no es válido.');
  }

  const value = pedido as Record<string, unknown>;
  if (!Array.isArray(value.productos) || value.productos.length === 0 || value.productos.length > 30) {
    throw new Error('El pedido debe contener entre 1 y 30 productos.');
  }

  const productos = value.productos.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Hay un producto con datos inválidos.');
    }

    const producto = item as Record<string, unknown>;
    if (typeof producto.nombre !== 'string' || producto.nombre.length === 0 || producto.nombre.length > 160
      || typeof producto.precio !== 'number' || !Number.isFinite(producto.precio)
      || typeof producto.cantidad !== 'number' || !Number.isInteger(producto.cantidad)
      || producto.cantidad < 1 || producto.cantidad > 100) {
      throw new Error('Hay un producto con datos inválidos.');
    }

    const imagenes = producto.imagenes;
    if (!Array.isArray(imagenes) || imagenes.length > 6
      || (imagenes.length > 0 && typeof producto.galeriaId !== 'string')
      || (imagenes.length > 0 && !UUID_PATTERN.test(producto.galeriaId as string))) {
      throw new Error('Las imágenes del pedido no son válidas.');
    }

    const rutas = imagenes.map((imagen) => {
      if (!imagen || typeof imagen !== 'object' || Array.isArray(imagen)) {
        throw new Error('Hay una imagen con datos inválidos.');
      }
      const value = imagen as Record<string, unknown>;
      const match = typeof value.ruta === 'string' ? OBJECT_PATTERN.exec(value.ruta) : null;
      if (!match || !UUID_PATTERN.test(match[1]) || !UUID_PATTERN.test(match[2])
        || match[1].toLowerCase() !== producto.galeriaId
        || typeof value.etiqueta !== 'string' || value.etiqueta.length > 80) {
        throw new Error('Hay una ruta de imagen inválida.');
      }
      return { etiqueta: value.etiqueta, ruta: value.ruta, galeriaId: match[1] };
    });

    return {
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: producto.cantidad,
      imagenes: rutas
    };
  });

  const nombre = typeof value.nombre === 'string' ? value.nombre.trim().slice(0, 120) : '';
  const ciudad = typeof value.ciudad === 'string' ? value.ciudad.trim().slice(0, 120) : '';
  if (typeof value.total !== 'number' || !Number.isFinite(value.total) || value.total < 0) {
    throw new Error('El total del pedido no es válido.');
  }

  return {
    nombre,
    ciudad,
    total: value.total,
    productos,
    createdAt: new Date().toISOString()
  };
}

async function verificarImagenes(pedido: ReturnType<typeof validarPedido>) {
  const grupos = new Map<string, Set<string>>();
  for (const producto of pedido.productos) {
    for (const imagen of producto.imagenes) {
      const nombreArchivo = imagen.ruta.split('/')[1];
      if (!grupos.has(imagen.galeriaId)) grupos.set(imagen.galeriaId, new Set());
      grupos.get(imagen.galeriaId)!.add(nombreArchivo);
    }
  }

  for (const [folder, expectedNames] of grupos) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 100 });
    if (error) throw error;
    const existingNames = new Set((data || []).map(file => file.name));
    if ([...expectedNames].some(name => !existingNames.has(name))) {
      throw new Error('No se encontraron todas las imágenes del pedido.');
    }
  }
}

async function crearGaleria(token: string, pedidoInput: unknown) {
  if (!TOKEN_PATTERN.test(token)) throw new Error('El enlace de acceso no es válido.');
  const pedido = validarPedido(pedidoInput);
  await verificarImagenes(pedido);

  const { data, error } = await supabase
    .from('pedido_galerias')
    .insert({ token_hash: await hashToken(token), pedido })
    .select('id, expires_at')
    .single();

  if (error) throw error;
  return { pedidoId: data.id, vence: data.expires_at };
}

async function consultarGaleria(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error('El enlace de la galería no es válido.');

  const { data, error } = await supabase
    .from('pedido_galerias')
    .select('id, pedido, expires_at')
    .eq('token_hash', await hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('La galería no existe o el enlace ya venció.');

  const productos = await Promise.all(data.pedido.productos.map(async (producto: Record<string, unknown>) => ({
    nombre: producto.nombre,
    cantidad: producto.cantidad,
    imagenes: await Promise.all((producto.imagenes as Array<Record<string, string>>).map(async imagen => {
      const { data: signedImage, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(imagen.ruta, 60 * 60);
      if (signedError) throw signedError;
      return { etiqueta: imagen.etiqueta, url: signedImage.signedUrl };
    }))
  })));

  return {
    pedidoId: data.id,
    vence: data.expires_at,
    nombre: data.pedido.nombre,
    ciudad: data.pedido.ciudad,
    total: data.pedido.total,
    productos
  };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return response({ error: 'Método no permitido.' }, 405);

  try {
    const body = await request.json();
    if (body.accion === 'crear') {
      const galeria = await crearGaleria(body.token, body.pedido);
      return response({ galeria });
    }
    if (body.accion === 'ver') {
      const galeria = await consultarGaleria(body.token);
      return response({ galeria });
    }
    return response({ error: 'La acción solicitada no es válida.' }, 400);
  } catch (error) {
    console.error('Error al procesar la galería del pedido:', error);
    const message = error instanceof Error ? error.message : 'No se pudo procesar la galería.';
    const expected = /inválid|válido|no es válida|no existe|venció|debe contener|no se encontraron/i.test(message);
    return response({ error: message }, expected ? 400 : 500);
  }
});
