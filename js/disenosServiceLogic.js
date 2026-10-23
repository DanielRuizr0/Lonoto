export function crearServicioDisenos(supabase, {
  alertar = mensaje => globalThis.alert(mensaje),
  informarError = (mensaje, error) => console.error(mensaje, error)
} = {}) {
  async function subirImagenStorage(file) {
    if (!file) return null;

    try {
      const extension = file.name.split('.').pop();
      const nombreArchivo = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
      const { error: errorSubida } = await supabase.storage
        .from('logos_disenos')
        .upload(nombreArchivo, file);

      if (errorSubida) {
        informarError('❌ Error detallado al subir a Supabase Storage:', errorSubida);
        return null;
      }

      const { data } = supabase.storage
        .from('logos_disenos')
        .getPublicUrl(nombreArchivo);

      if (!data || !data.publicUrl) return null;
      return data.publicUrl;
    } catch (error) {
      informarError('❌ Excepción crítica al subir imagen:', error);
      return null;
    }
  }

  async function guardarDiseñoActual(nombreDiseno, configuracion3D, urlVistaPrevia = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alertar('Debes iniciar sesión para guardar tu diseño.');
        return null;
      }

      const { data, error } = await supabase
        .from('disenos_personalizados')
        .insert([{
          id_usuario: user.id,
          id_producto_base: 1,
          nombre_diseno: nombreDiseno || 'Mi Diseño Lonoto',
          configuracion_3d: configuracion3D,
          url_vista_previa_3d: urlVistaPrevia
        }])
        .select();

      if (error) throw error;

      alertar('¡Diseño guardado exitosamente!');
      return data[0];
    } catch (error) {
      informarError('Error al guardar el diseño:', error);
      alertar('No se pudo guardar el diseño. Verifica la conexión.');
      return null;
    }
  }

  async function obtenerMisDiseños() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('disenos_personalizados')
      .select('*')
      .eq('id_usuario', user.id)
      .order('fecha_creacion', { ascending: false });

    if (error) return [];
    return data;
  }

  async function cargarDiseñoEnEscena(idDiseno) {
    if (!idDiseno) return null;

    const { data, error } = await supabase
      .from('disenos_personalizados')
      .select('*')
      .eq('id_diseno', idDiseno)
      .single();

    if (error) return null;
    return data;
  }

  async function eliminarDiseño(idDiseno) {
    const { error } = await supabase
      .from('disenos_personalizados')
      .delete()
      .eq('id_diseno', idDiseno);

    return !error;
  }

  return {
    subirImagenStorage,
    guardarDiseñoActual,
    obtenerMisDiseños,
    cargarDiseñoEnEscena,
    eliminarDiseño
  };
}
