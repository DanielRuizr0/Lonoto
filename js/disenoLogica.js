export function esPixelFondoBlanco(rojo, verde, azul, alfa, tolerancia) {
  if (alfa === 0) return false;

  const umbral = 255 - Number.parseInt(tolerancia, 10);
  return rojo > umbral && verde > umbral && azul > umbral;
}

export function crearConfiguracionDiseno(estado, texturaDataURL) {
  return {
    colorBase: estado.baseColor,
    escalaTextura: estado.imgScale,
    posicionX: estado.imgX,
    posicionY: estado.imgY,
    rotacionTextura: estado.imgRot,
    duplicarEstampado: Boolean(estado.duplicateImage),
    texturaDataURL
  };
}

export function crearProductoDisenoParaPedido(diseno) {
  const galeria = diseno.configuracion_3d?.galeriaPrivada;
  if (!galeria || typeof galeria.id !== 'string' || !Array.isArray(galeria.imagenes)
    || galeria.imagenes.length === 0 || galeria.imagenes.length > 6) {
    throw new Error('Este diseño se guardó antes de generar sus vistas 3D. Ábrelo en Diseño 3D, guárdalo nuevamente y vuelve a pedirlo.');
  }

  return {
    nombre: diseno.nombre_diseno || 'MEDIA PERSONALIZADA 3D',
    precio: 25000,
    cantidad: 1,
    galeriaId: galeria.id,
    imagenes: galeria.imagenes.map(imagen => ({
      etiqueta: imagen.etiqueta,
      ruta: imagen.ruta
    }))
  };
}

export function crearMensajePedidoDiseno(diseno, enlaceGaleria) {
  const config = diseno.configuracion_3d || {};
  let mensaje = `¡Hola LONOTO! 👋 Deseo pedir la fabricación de mi prototipo:\n\n`;
  mensaje += `📌 *Nombre:* ${diseno.nombre_diseno}\n`;
  mensaje += `🆔 *Referencia:* #${diseno.id_diseno}\n`;
  mensaje += `🎨 *Color Base Media:* ${config.colorBase || 'Blanco'}\n\n`;
  mensaje += `🧦 *VER MODELO 3D Y FOTOS DEL PEDIDO:*\n${enlaceGaleria}\n\n`;
  mensaje += `Quedo atento para confirmar el valor total y método de envío.`;
  return mensaje;
}
