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
