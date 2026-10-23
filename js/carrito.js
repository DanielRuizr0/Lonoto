// ==========================================
// MÓDULO GLOBAL DEL CARRITO DE COMPRAS - LONOTO (POR USUARIO)
// ==========================================
import { supabase } from './supabaseClient.js';
import {
  agregarProductoAlCarrito,
  ajustarCantidadCarrito,
  calcularTotalCarrito,
  crearMensajePedido,
  eliminarProductoCarrito
} from './logicaCarrito.js';
import { crearGaleriaPrivadaPedido } from './galeriaPedido.js';

const TELEFONO_WHATSAPP = '573127557563';
const IMG_FALLBACK = 'https://via.placeholder.com/100x100/141414/CCFF00?text=LONOTO';

let carrito = [];
let usuarioActual = null;

function obtenerClaveStorage() {
  return usuarioActual ? `lonoto_carrito_${usuarioActual.id}` : 'lonoto_carrito_invitado';
}

document.addEventListener('DOMContentLoaded', async () => {
  await verificarUsuarioYCargarCarrito();
  inicializarEventosCarrito();

  supabase.auth.onAuthStateChange(async (event, session) => {
    usuarioActual = session ? session.user : null;
    carrito = [];
    await cargarCarritoPorUsuario();
  });
});

async function verificarUsuarioYCargarCarrito() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    usuarioActual = user;
    await cargarCarritoPorUsuario();
  } catch (err) {
    console.warn('Error verificando usuario:', err);
    cargarCarritoLocal();
  }
}

async function cargarCarritoPorUsuario() {
  if (usuarioActual) {
    try {
      const { data, error } = await supabase
        .from('carrito_usuarios')
        .select('items')
        .eq('id_usuario', usuarioActual.id)
        .maybeSingle();

      if (data && data.items && Array.isArray(data.items)) {
        carrito = data.items;
      } else {
        const clave = obtenerClaveStorage();
        carrito = JSON.parse(localStorage.getItem(clave)) || [];
        if (carrito.length > 0) {
          await sincronizarCarritoEnNube();
        }
      }
    } catch (err) {
      console.error('Error al cargar carrito desde la nube:', err);
      cargarCarritoLocal();
    }
  } else {
    cargarCarritoLocal();
  }

  renderizarCarrito();
}

function cargarCarritoLocal() {
  const clave = obtenerClaveStorage();
  carrito = JSON.parse(localStorage.getItem(clave)) || [];
  renderizarCarrito();
}

function inicializarEventosCarrito() {
  const modalCarrito = document.getElementById('modal-carrito');
  const btnAbrirCarrito = document.getElementById('btn-abrir-carrito');
  const btnCerrarCarrito = document.getElementById('cerrar-carrito');

  if (btnAbrirCarrito && modalCarrito) {
    btnAbrirCarrito.addEventListener('click', (e) => {
      e.preventDefault();
      modalCarrito.classList.remove('oculto');
    });
  }

  if (btnCerrarCarrito && modalCarrito) {
    btnCerrarCarrito.addEventListener('click', () => {
      modalCarrito.classList.add('oculto');
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === modalCarrito) modalCarrito.classList.add('oculto');
  });

  const inputNombre = document.getElementById('cliente-nombre');
  const inputCiudad = document.getElementById('cliente-ciudad');
  const btnWhatsappCarrito = document.getElementById('btn-whatsapp-carrito');
  const btnConfirmarPedido = document.createElement('button');
  btnConfirmarPedido.type = 'button';
  btnConfirmarPedido.className = 'btn-vaciar-pedido';
  btnConfirmarPedido.textContent = 'YA CONFIRMÉ EL PEDIDO - VACIAR CARRITO';
  btnConfirmarPedido.hidden = true;
  btnConfirmarPedido.addEventListener('click', confirmarPedidoYVaciarCarrito);
  btnWhatsappCarrito?.insertAdjacentElement('afterend', btnConfirmarPedido);

  if (inputNombre) inputNombre.addEventListener('input', renderizarCarrito);
  if (inputCiudad) inputCiudad.addEventListener('input', renderizarCarrito);
  if (btnWhatsappCarrito) {
    btnWhatsappCarrito.addEventListener('click', prepararPedidoConGaleria);
  }

  renderizarCarrito();
}

async function prepararPedidoConGaleria(evento) {
  const botonPedido = evento.currentTarget;
  evento.preventDefault();

  if (botonPedido.getAttribute('aria-busy') === 'true') {
    return;
  }

  if (carrito.length === 0) return;

  const productosPersonalizados = carrito.filter(producto => producto.esCustom);
  if (productosPersonalizados.length === 0) {
    const ventanaWhatsApp = window.open('about:blank', '_blank');
    if (!ventanaWhatsApp) {
      alert('Permite las ventanas emergentes para abrir WhatsApp y vuelve a intentarlo.');
      return;
    }

    ventanaWhatsApp.opener = null;
    ventanaWhatsApp.location.href = botonPedido.href;
    mostrarConfirmacionPedido();
    return;
  }

  if (productosPersonalizados.some(producto =>
    !producto.galleryId || !Array.isArray(producto.galleryImages) || producto.galleryImages.length === 0
  )) {
    alert('Este diseño se agregó con una versión anterior. Vuelve a agregarlo desde el personalizador 3D para crear su galería privada.');
    return;
  }

  const ventanaWhatsApp = window.open('about:blank', '_blank');
  if (!ventanaWhatsApp) {
    alert('Permite las ventanas emergentes para abrir WhatsApp y vuelve a intentarlo.');
    return;
  }

  ventanaWhatsApp.opener = null;
  ventanaWhatsApp.document.title = 'Preparando pedido';
  ventanaWhatsApp.document.body.textContent = 'Preparando la galería privada del pedido...';
  botonPedido.setAttribute('aria-busy', 'true');

  try {
    const nombre = document.getElementById('cliente-nombre')?.value || '';
    const ciudad = document.getElementById('cliente-ciudad')?.value || '';
    const pedido = {
      nombre,
      ciudad,
      total: calcularTotalCarrito(carrito),
      productos: carrito.map(producto => ({
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: producto.cantidad || 1,
        galeriaId: producto.esCustom ? producto.galleryId : null,
        imagenes: producto.esCustom
          ? producto.galleryImages.map(imagen => ({
            etiqueta: imagen.label,
            ruta: imagen.path,
            galeriaId: producto.galleryId
          }))
          : []
      }))
    };

    const enlaceGaleria = await crearGaleriaPrivadaPedido(supabase, pedido);
    const mensaje = crearMensajePedido(carrito, nombre, ciudad, enlaceGaleria);
    const enlaceWhatsApp = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    ventanaWhatsApp.location.href = enlaceWhatsApp;
    mostrarConfirmacionPedido();
  } catch (error) {
    console.error('No se pudo crear la galería privada del pedido:', error);
    ventanaWhatsApp.close();
    alert('No se pudo crear la galería privada. Inténtalo de nuevo o contacta con soporte.');
  } finally {
    botonPedido.removeAttribute('aria-busy');
  }
}

function mostrarConfirmacionPedido() {
  const botonConfirmacion = document.querySelector('.btn-vaciar-pedido');
  if (botonConfirmacion) botonConfirmacion.hidden = false;
}

async function confirmarPedidoYVaciarCarrito(evento) {
  const boton = evento.currentTarget;
  if (carrito.length === 0 || boton.disabled) return;

  boton.disabled = true;

  try {
    if (usuarioActual) {
      const { error } = await supabase
        .from('carrito_usuarios')
        .upsert({
          id_usuario: usuarioActual.id,
          items: [],
          actualizado_at: new Date()
        }, { onConflict: 'id_usuario' });

      if (error) throw error;
    }

    localStorage.setItem(obtenerClaveStorage(), JSON.stringify([]));
    carrito = [];
    boton.hidden = true;
    renderizarCarrito();
  } catch (error) {
    console.error('No se pudo vaciar el carrito después de confirmar el pedido:', error);
    alert('No se pudo vaciar el carrito. Inténtalo de nuevo.');
  } finally {
    boton.disabled = false;
  }
}

window.agregarAlCarrito = async function(producto) {
  carrito = agregarProductoAlCarrito(carrito, producto);

  await guardarYActualizar();

  const modalCarrito = document.getElementById('modal-carrito');
  if (modalCarrito) {
    modalCarrito.classList.remove('oculto');
  }
};

function renderizarCarrito() {
  const listaCarrito = document.getElementById('lista-carrito');
  const totalCarritoEl = document.getElementById('total-carrito');
  const cartCountEl = document.getElementById('cart-count');
  const btnWhatsappCarrito = document.getElementById('btn-whatsapp-carrito');
  const inputNombre = document.getElementById('cliente-nombre');
  const inputCiudad = document.getElementById('cliente-ciudad');

  let totalItems = 0;

  carrito.forEach(prod => {
    totalItems += (prod.cantidad || 1);
  });

  if (cartCountEl) cartCountEl.textContent = totalItems;
  if (!listaCarrito) return;

  listaCarrito.innerHTML = '';

  if (carrito.length === 0) {
    listaCarrito.innerHTML = '<p class="carrito-vacio">// Tu carrito está vacío.</p>';
    if (totalCarritoEl) totalCarritoEl.textContent = '$0 COP';
    const botonConfirmacion = document.querySelector('.btn-vaciar-pedido');
    if (botonConfirmacion) botonConfirmacion.hidden = true;
    if (btnWhatsappCarrito) {
      btnWhatsappCarrito.style.pointerEvents = 'none';
      btnWhatsappCarrito.style.opacity = '0.5';
    }
    return;
  }

  if (btnWhatsappCarrito) {
    btnWhatsappCarrito.style.pointerEvents = 'auto';
    btnWhatsappCarrito.style.opacity = '1';
  }

  carrito.forEach((prod, index) => {
    const cant = prod.cantidad || 1;

    const divItem = document.createElement('div');
    divItem.classList.add('item-carrito');
    divItem.innerHTML = `
      <img src="${prod.img || IMG_FALLBACK}" 
           alt="${prod.nombre}" 
           class="img-item-cart"
           onerror="this.onerror=null; this.src='${IMG_FALLBACK}';">
      <div class="info-item-cart">
        <h4>${prod.nombre}</h4>
        <p class="precio-item">$${prod.precio.toLocaleString('es-CO')} COP</p>
      </div>
      <div class="controles-cantidad">
        <button type="button" class="btn-cant" data-action="restar" data-index="${index}">-</button>
        <span>${cant}</span>
        <button type="button" class="btn-cant" data-action="sumar" data-index="${index}">+</button>
      </div>
      <button type="button" class="btn-eliminar" data-index="${index}">&times;</button>
    `;

    listaCarrito.appendChild(divItem);
  });

  const totalGeneral = calcularTotalCarrito(carrito);
  if (totalCarritoEl) totalCarritoEl.textContent = `$${totalGeneral.toLocaleString('es-CO')} COP`;
  const mensajeWA = crearMensajePedido(
    carrito,
    inputNombre ? inputNombre.value : '',
    inputCiudad ? inputCiudad.value : ''
  );
  
  if (btnWhatsappCarrito) {
    btnWhatsappCarrito.href = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensajeWA)}`;
  }

  asignarEventosControles();
}

function asignarEventosControles() {
  const botonesCant = document.querySelectorAll('.btn-cant');
  const botonesEliminar = document.querySelectorAll('.btn-eliminar');

  botonesCant.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = Number.parseInt(e.target.getAttribute('data-index'), 10);
      const accion = e.target.getAttribute('data-action');
      carrito = ajustarCantidadCarrito(carrito, index, accion);
      await guardarYActualizar();
    });
  });

  botonesEliminar.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = Number.parseInt(e.target.getAttribute('data-index'), 10);
      carrito = eliminarProductoCarrito(carrito, index);
      await guardarYActualizar();
    });
  });
}

async function guardarYActualizar() {
  const clave = obtenerClaveStorage();
  localStorage.setItem(clave, JSON.stringify(carrito));
  const botonConfirmacion = document.querySelector('.btn-vaciar-pedido');
  if (botonConfirmacion) botonConfirmacion.hidden = true;

  if (usuarioActual) {
    await sincronizarCarritoEnNube();
  }

  renderizarCarrito();
}

async function sincronizarCarritoEnNube() {
  if (!usuarioActual) return;
  try {
    const { error } = await supabase
      .from('carrito_usuarios')
      .upsert({ 
        id_usuario: usuarioActual.id, 
        items: carrito,
        actualizado_at: new Date()
      }, { onConflict: 'id_usuario' });

    if (error) console.error('Error al sincronizar carrito en Supabase:', error);
  } catch (err) {
    console.error('Error al guardar carrito en Supabase:', err);
  }
}