import { supabase } from '../js/supabaseClient.js';
import { crearGaleriaPrivadaPedido } from '../js/galeriaPedido.js';
import {
  crearMensajePedidoDiseno,
  crearProductoDisenoParaPedido
} from '../js/disenoLogica.js';

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
      gridDisenos.querySelectorAll('.btn-pedir-diseno').forEach(boton => {
        boton.addEventListener('click', () => {
          const indice = Number.parseInt(boton.dataset.indice, 10);
          pedirPorWhatsApp(disenos[indice], boton);
        });
      });
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

  contenedor.innerHTML = disenos.map((diseno, indice) => {
    const tieneCapturaValida = diseno.url_vista_previa_3d && diseno.url_vista_previa_3d.startsWith('data:image');
    const vistaPrevia = tieneCapturaValida ? diseno.url_vista_previa_3d : imgFallback;
    const config = diseno.configuracion_3d || {};
    const colorHex = config.colorBase || '#FFFFFF';

    const fecha = new Date(diseno.fecha_creacion).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

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
          <button class="btn-lonoto btn-neon btn-pedir-diseno" data-indice="${indice}" style="flex: 1;">
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

async function pedirPorWhatsApp(diseno, boton) {
  const galeriaGuardada = diseno.configuracion_3d?.galeriaPrivada;
  const debePrepararVistas = !galeriaGuardada || !Array.isArray(galeriaGuardada.imagenes)
    || galeriaGuardada.imagenes.length === 0;
  const clavePedidoPendiente = 'lonoto_diseno_pedido_pendiente';

  if (debePrepararVistas) {
    sessionStorage.setItem(clavePedidoPendiente, JSON.stringify(diseno));
  }

  const ventanaWhatsApp = window.open('about:blank', '_blank');
  if (!ventanaWhatsApp) {
    if (debePrepararVistas) sessionStorage.removeItem(clavePedidoPendiente);
    alert('Permite las ventanas emergentes para abrir WhatsApp y vuelve a intentarlo.');
    return;
  }

  ventanaWhatsApp.opener = null;
  ventanaWhatsApp.document.title = 'Preparando pedido';
  ventanaWhatsApp.document.body.textContent = 'Preparando la galería privada del pedido...';
  boton.disabled = true;

  try {
    if (debePrepararVistas) {
      const paginaDiseno = new URL('../diseño 3d/Diseño-3D.html', import.meta.url);
      paginaDiseno.searchParams.set('prepararPedidoGuardado', '1');
      ventanaWhatsApp.location.href = paginaDiseno.href;
      return;
    }

    const pedido = {
      nombre: '',
      ciudad: '',
      total: 25000,
      productos: [crearProductoDisenoParaPedido(diseno)]
    };
    const enlaceGaleria = await crearGaleriaPrivadaPedido(supabase, pedido);
    const mensaje = crearMensajePedidoDiseno(diseno, enlaceGaleria);
    const numeroTelefono = '573127557563';
    ventanaWhatsApp.location.href =
      `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
  } catch (error) {
    console.error('No se pudo preparar la galería privada del diseño guardado:', error);
    ventanaWhatsApp.close();
    alert(error instanceof Error
      ? `No se pudo preparar la galería privada: ${error.message}`
      : 'No se pudo preparar la galería privada. Inténtalo de nuevo.');
  } finally {
    boton.disabled = false;
  }
}

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