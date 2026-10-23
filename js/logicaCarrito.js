export function agregarProductoAlCarrito(carrito, producto) {
  const items = carrito.map(item => ({ ...item }));

  if (!producto.esCustom) {
    const existente = items.find(item => item.nombre === producto.nombre && !item.esCustom);
    if (existente) {
      existente.cantidad = (existente.cantidad || 1) + (producto.cantidad || 1);
    } else {
      items.push({ ...producto, cantidad: producto.cantidad || 1 });
    }
  } else {
    items.push({ ...producto });
  }

  return items;
}

export function ajustarCantidadCarrito(carrito, indice, accion) {
  if (!Number.isInteger(indice) || indice < 0 || indice >= carrito.length) {
    return [...carrito];
  }

  const items = carrito.map(item => ({ ...item }));
  const producto = items[indice];

  if (!producto.cantidad) producto.cantidad = 1;

  if (accion === 'sumar') {
    producto.cantidad += 1;
  } else if (accion === 'restar') {
    producto.cantidad -= 1;
    if (producto.cantidad <= 0) items.splice(indice, 1);
  }

  return items;
}

export function eliminarProductoCarrito(carrito, indice) {
  if (!Number.isInteger(indice) || indice < 0 || indice >= carrito.length) {
    return [...carrito];
  }

  return carrito.filter((_, itemIndice) => itemIndice !== indice);
}

export function calcularTotalCarrito(carrito) {
  return carrito.reduce((total, producto) => {
    return total + producto.precio * (producto.cantidad || 1);
  }, 0);
}

export function crearMensajePedido(carrito, nombre = '', ciudad = '', enlaceGaleria = '') {
  const nombreVal = nombre.trim();
  const ciudadVal = ciudad.trim();

  let saludo = '¡Hola LONOTO! 👋';
  if (nombreVal && ciudadVal) {
    saludo = `¡Hola LONOTO! 👋 Soy *${nombreVal}* de *${ciudadVal}*.`;
  } else if (nombreVal) {
    saludo = `¡Hola LONOTO! 👋 Soy *${nombreVal}*.`;
  } else if (ciudadVal) {
    saludo = `¡Hola LONOTO! 👋 Escribo desde *${ciudadVal}*.`;
  }

  let mensaje = `${saludo}\nQuiero realizar el pedido de los siguientes productos:\n\n`;

  carrito.forEach(producto => {
    const cantidad = producto.cantidad || 1;
    const subtotal = producto.precio * cantidad;
    const etiqueta = producto.esCustom ? ' [PROTOTIPO 3D]' : '';
    mensaje += `• *${cantidad}x* ${producto.nombre}${etiqueta} - $${subtotal.toLocaleString('es-CO')} COP\n`;

  });

  if (enlaceGaleria) {
    mensaje += `\n🧦 *Ver modelos y fotos del pedido:*\n${enlaceGaleria}\n`;
  }

  const total = calcularTotalCarrito(carrito);
  mensaje += `\n💰 *TOTAL A PAGAR:* $${total.toLocaleString('es-CO')} COP\n\nQuedo atento para confirmar datos de envío.`;
  return mensaje;
}
