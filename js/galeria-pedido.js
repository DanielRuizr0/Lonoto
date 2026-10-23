import { supabase } from './supabaseClient.js';

const status = document.getElementById('gallery-status');
const content = document.getElementById('gallery-content');

function addText(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function mostrarError(message) {
  status.hidden = false;
  status.classList.add('error');
  status.textContent = message;
}

function mostrarGaleria(galeria) {
  const heading = document.createElement('header');
  heading.className = 'gallery-heading';
  addText(heading, 'span', `// PEDIDO_${galeria.pedidoId.slice(0, 8).toUpperCase()}`, 'meta-tag mono');
  addText(heading, 'h1', 'Galería del pedido');

  const resumen = [
    galeria.nombre && `Cliente: ${galeria.nombre}`,
    galeria.ciudad && `Ciudad: ${galeria.ciudad}`,
    `Total: $${Number(galeria.total).toLocaleString('es-CO')} COP`,
    `Enlace disponible hasta: ${new Date(galeria.vence).toLocaleDateString('es-CO')}`
  ].filter(Boolean).join(' · ');
  addText(heading, 'p', resumen, 'gallery-order-summary');
  content.appendChild(heading);

  for (const producto of galeria.productos) {
    const card = document.createElement('article');
    card.className = 'gallery-product';
    addText(card, 'h2', `${producto.nombre} · ${producto.cantidad} unidad(es)`);
    const images = document.createElement('div');
    images.className = 'gallery-images';

    for (const image of producto.imagenes) {
      const figure = document.createElement('figure');
      figure.className = 'gallery-image';
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = `${producto.nombre}: ${image.etiqueta}`;
      img.loading = 'lazy';
      const caption = document.createElement('figcaption');
      caption.textContent = image.etiqueta;
      figure.append(img, caption);
      images.appendChild(figure);
    }

    card.appendChild(images);
    content.appendChild(card);
  }

  status.hidden = true;
  content.hidden = false;
}

async function cargarGaleria() {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    mostrarError('El enlace de la galería no es válido o está incompleto.');
    return;
  }

  const { data, error } = await supabase.functions.invoke('pedido-galeria', {
    body: { accion: 'ver', token }
  });

  if (error) {
    console.error('No se pudo cargar la galería del pedido:', error);
    mostrarError('No se pudo abrir la galería. El enlace puede haber vencido o no estar disponible.');
    return;
  }

  if (!data?.galeria) {
    mostrarError('No se encontró la galería solicitada.');
    return;
  }

  mostrarGaleria(data.galeria);
}

cargarGaleria().catch(error => {
  console.error('Error inesperado al cargar la galería:', error);
  mostrarError('Ocurrió un error al cargar la galería. Inténtalo de nuevo más tarde.');
});
