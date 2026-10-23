import { supabase } from '../js/supabaseClient.js';
import { crearServicioDisenos } from '../js/disenosServiceLogic.js';

const servicioDisenos = crearServicioDisenos(supabase);

export const subirImagenStorage = servicioDisenos.subirImagenStorage;
export async function subirArchivoGaleria(file, ruta) {
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

export const guardarDiseñoActual = servicioDisenos.guardarDiseñoActual;
export const guardarDiseño = guardarDiseñoActual;
export const obtenerMisDiseños = servicioDisenos.obtenerMisDiseños;
export const cargarDiseñoEnEscena = servicioDisenos.cargarDiseñoEnEscena;
export const eliminarDiseño = servicioDisenos.eliminarDiseño;
