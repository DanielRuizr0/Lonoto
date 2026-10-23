import { supabase } from '../js/supabaseClient.js';
import { crearServicioDisenos } from '../js/disenosServiceLogic.js';
import { subirImagenGaleria as subirImagenGaleriaPrivada } from '../js/galeriaPedido.js';

const servicioDisenos = crearServicioDisenos(supabase);

export const subirImagenStorage = servicioDisenos.subirImagenStorage;
export async function subirArchivoGaleria(file, ruta) {
  return subirImagenGaleriaPrivada(supabase, file, ruta);
}

export const guardarDiseñoActual = servicioDisenos.guardarDiseñoActual;
export const guardarDiseño = guardarDiseñoActual;
export const obtenerMisDiseños = servicioDisenos.obtenerMisDiseños;
export const cargarDiseñoEnEscena = servicioDisenos.cargarDiseñoEnEscena;
export const eliminarDiseño = servicioDisenos.eliminarDiseño;
