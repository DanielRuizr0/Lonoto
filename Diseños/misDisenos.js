import { supabase } from '../js/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  const loader = document.getElementById('loader-disenos');
  const mensajeVacio = document.getElementById('mensaje-vacio');
  const gridDisenos = document.getElementById('grid-disenos');
  const totalCounter = document.getElementById('total-disenos-count');

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (loader) {
        loader.innerHTML = `
          <div style="text-align: center; color: #FF3B8B; padding: 20px;" class="card-bento card-clara">
            <span class="badge-tag">// SESIÓN NO ENCONTRADA</span>
            <p style="margin-top: 1rem; font-weight: bold; color: #1C1B19;">Debes iniciar sesión para consultar tus prototipos 3D.</p>
            <a href="../index.html" class="btn-lonoto btn-neon" style="display: inline-block; width: auto; margin-top: 1rem;">INICIAR SESIÓN</a>
          </div>
        `;
      }
      return;
    }

    const { data: disenos, error } = await supabase
      .from('disenos_personalizados')
      .select('*')
      .eq('id_usuario', user.id)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    if (loader) loader.style.display = 'none';

    // Actualizar el contador global
    if (totalCounter) {
      totalCounter.textContent = disenos ? disenos.length : 0;
    }

    if (!disenos || disenos.length === 0) {
      if (mensajeVacio) mensajeVacio.style.display = 'block';
      return;
    }

    if (gridDisenos) {
      gridDisenos.style.display = 'grid';
      renderizarTarjetas(disenos, gridDisenos);
    }

  } catch (error) {
    console.error('Error al cargar prototipos:', error);
    if (loader) {
      loader.innerHTML = `
        <div style="text-align: center; color: #FF3B8B; padding: 20px;">
          <span class="badge-tag" style="border-color: #FF3B8B;">// ERROR DE CONEXIÓN</span>
          <p style="margin-top: 1rem; font-weight: bold;">No se pudieron recuperar los diseños desde Supabase.</p>
        </div>
      `;
    }
  }
});

function renderizarTarjetas(disenos, contenedor) {
  const imgFallback = 'https://via.placeholder.com/300x200/111/CCFF00?text=LONOTO+3D';

  contenedor.innerHTML = disenos.map(diseno => {
    const tieneCapturaValida = diseno.url_vista_previa_3d && diseno.url_vista_previa_3d.startsWith('data:image');
    const vistaPrevia = tieneCapturaValida ? diseno.url_vista_previa_3d : imgFallback;
    const config = diseno.configuracion_3d || {};
    const colorHex = config.colorBase || '#FFFFFF';

    const fecha = new Date(diseno.fecha_creacion).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const disenoJSON = JSON.stringify(diseno).replace(/"/g, '&quot;');

    return `
      <article class="card-bento card-clara">
        <div>
          <span class="meta-tag">// REGISTRADO: ${fecha}</span>
          <h3 class="nombre-diseno">${diseno.nombre_diseno}</h3>
          
          <!-- Swatch de Color Base -->
          <div class="swatches-row">
            <span style="font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; color: #666;">COLOR BASE:</span>
            <span class="swatch-item" style="background-color: ${colorHex};" title="Color: ${colorHex}"></span>
          </div>
        </div>

        <div class="thumb-blueprint">
          <img src="${vistaPrevia}" 
               alt="${diseno.nombre_diseno}" 
               onerror="this.onerror=null; this.src='${imgFallback}';">
        </div>

        <div style="display: flex; gap: 0.6rem; margin-top: auto;">
          <button onclick="pedirPorWhatsApp('${disenoJSON}')" class="btn-lonoto btn-neon" style="flex: 1;">
            PEDIR POR WHATSAPP
          </button>
          <button onclick="borrarDiseño('${diseno.id_diseno}')" class="btn-peligro" title="Eliminar prototipo">
            🗑️
          </button>
        </div>
      </article>
    `;
  }).join('');
}

window.pedirPorWhatsApp = (disenoInput) => {
  const diseno = typeof disenoInput === 'string' ? JSON.parse(disenoInput) : disenoInput;
  const numeroTelefono = "573127557563";
  const config = diseno.configuracion_3d || {};

  let mensaje = `¡Hola LONOTO! 👋 Deseo pedir la fabricación de mi prototipo:\n\n`;
  mensaje += `📌 *Nombre:* ${diseno.nombre_diseno}\n`;
  mensaje += `🆔 *Referencia:* #${diseno.id_diseno}\n`;
  mensaje += `🎨 *Color Base Media:* ${config.colorBase || 'Blanco'}\n\n`;

  if (config.urlLogoHD) {
    mensaje += `🖼️ *DESCARGAR LOGO ORIGINAL HD:*\n${config.urlLogoHD}\n\n`;
  } else {
    mensaje += `⚠️ *Nota:* Este diseño se creó solo con color base o la imagen no se subió a Storage.\n\n`;
  }

  mensaje += `Quedo atento para confirmar el valor total y método de envío.`;

  window.open(`https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
};

window.borrarDiseño = async (idDiseno) => {
  if (confirm('¿Estás seguro de que deseas eliminar este diseño de tu colección?')) {
    const { error } = await supabase
      .from('disenos_personalizados')
      .delete()
      .eq('id_diseno', idDiseno);

    if (!error) {
      window.location.reload();
    } else {
      alert('Error al eliminar el diseño');
    }
  }
};