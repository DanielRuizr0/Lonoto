import {
  agregarProductoAlCarrito,
  ajustarCantidadCarrito,
  calcularTotalCarrito,
  crearMensajePedido,
  eliminarProductoCarrito
} from '../js/logicaCarrito.js';
import {
  crearConfiguracionDiseno,
  crearMensajePedidoDiseno,
  crearProductoDisenoParaPedido,
  esPixelFondoBlanco
} from '../js/disenoLogica.js';
import { crearServicioDisenos } from '../js/disenosServiceLogic.js';
import { crearGaleriaPrivadaPedido } from '../js/galeriaPedido.js';

const resultados = document.getElementById('resultados');
const pruebas = [];

function probar(nombre, funcion) {
  pruebas.push({ nombre, funcion });
}

function afirmar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function afirmarIgual(actual, esperado) {
  afirmar(
    JSON.stringify(actual) === JSON.stringify(esperado),
    `Esperado ${JSON.stringify(esperado)}, recibido ${JSON.stringify(actual)}`
  );
}

function crearSupabaseFalso({ user = { id: 'usuario-1' }, respuestas = [], urlPublica } = {}) {
  const llamadas = [];
  const siguienteRespuesta = () => respuestas.shift() || { data: null, error: null };

  const supabase = {
    auth: {
      getUser: async () => ({ data: { user } })
    },
    from(tabla) {
      llamadas.push({ metodo: 'from', tabla });
      const respuesta = siguienteRespuesta();
      const consulta = {
        select(valor) {
          llamadas.push({ metodo: 'select', valor });
          return consulta;
        },
        insert(registros) {
          llamadas.push({ metodo: 'insert', registros });
          return consulta;
        },
        delete() {
          llamadas.push({ metodo: 'delete' });
          return consulta;
        },
        eq(campo, valor) {
          llamadas.push({ metodo: 'eq', campo, valor });
          return consulta;
        },
        order(campo, opciones) {
          llamadas.push({ metodo: 'order', campo, opciones });
          return consulta;
        },
        single() {
          llamadas.push({ metodo: 'single' });
          return consulta;
        },
        then(resolve, reject) {
          return Promise.resolve(respuesta).then(resolve, reject);
        }
      };
      return consulta;
    },
    storage: {
      from(bucket) {
        llamadas.push({ metodo: 'storage.from', bucket });
        return {
          async upload(ruta, archivo) {
            llamadas.push({ metodo: 'upload', ruta, archivo });
            return siguienteRespuesta();
          },
          getPublicUrl(ruta) {
            llamadas.push({ metodo: 'getPublicUrl', ruta });
            return { data: { publicUrl: urlPublica } };
          }
        };
      }
    }
  };

  return { supabase, llamadas };
}

const media = { nombre: 'Media Urban', precio: 20000, cantidad: 1, esCustom: false };

probar('acumula productos estándar del mismo nombre', () => {
  const carrito = agregarProductoAlCarrito([media], { ...media, cantidad: 2 });
  afirmarIgual(carrito, [{ ...media, cantidad: 3 }]);
  afirmarIgual(media.cantidad, 1);
});

probar('mantiene separados los prototipos personalizados', () => {
  const prototipo = { ...media, esCustom: true };
  const carrito = agregarProductoAlCarrito([prototipo], prototipo);
  afirmarIgual(carrito, [prototipo, prototipo]);
});

probar('aumenta la cantidad del producto indicado', () => {
  const carrito = ajustarCantidadCarrito([media], 0, 'sumar');
  afirmarIgual(carrito[0].cantidad, 2);
});

probar('elimina el producto al restar su última unidad', () => {
  afirmarIgual(ajustarCantidadCarrito([media], 0, 'restar'), []);
});

probar('no altera el carrito ante un índice inválido', () => {
  const carrito = [media];
  afirmarIgual(ajustarCantidadCarrito(carrito, 4, 'sumar'), carrito);
  afirmarIgual(eliminarProductoCarrito(carrito, -1), carrito);
});

probar('elimina solo el producto seleccionado', () => {
  const segundaMedia = { ...media, nombre: 'Media Neon' };
  afirmarIgual(eliminarProductoCarrito([media, segundaMedia], 0), [segundaMedia]);
});

probar('calcula el total con cantidad explícita y cantidad predeterminada', () => {
  afirmarIgual(calcularTotalCarrito([
    { precio: 20000, cantidad: 2 },
    { precio: 5000 }
  ]), 45000);
});

probar('construye el pedido con datos del cliente, prototipo y enlaces válidos', () => {
  const mensaje = crearMensajePedido([
    {
      nombre: 'Media personalizada',
      precio: 25000,
      esCustom: true,
      cantidad: 1,
      galleryImages: [{ label: 'Vista principal', path: 'private/modelo.jpg' }]
    }
  ], ' Ana ', ' Cali ');

  afirmar(mensaje.includes('Soy *Ana* de *Cali*.'), 'Debe incluir nombre y ciudad');
  afirmar(mensaje.includes('Media personalizada [PROTOTIPO 3D]'), 'Debe identificar el prototipo');
  afirmar(!mensaje.includes('modelo.jpg'), 'No debe revelar rutas internas de imágenes');
  afirmar(mensaje.includes('$25.000 COP'), 'Debe incluir el total del pedido');
});

probar('incluye un solo enlace a la galería privada sin exponer rutas de imágenes', () => {
  const enlace = 'https://lonoto.test/paginas/galeria-pedido.html?token=secreto';
  const mensaje = crearMensajePedido([{
    nombre: 'Media personalizada',
    precio: 25000,
    esCustom: true,
    cantidad: 1,
    galleryImages: [{ label: 'Vista principal', path: 'private/modelo.jpg' }]
  }], '', '', enlace);

  afirmar(mensaje.includes(enlace), 'Debe compartir el enlace privado de la galería');
  afirmar(!mensaje.includes('private/modelo.jpg'), 'No debe incluir las rutas de almacenamiento');
  afirmar(mensaje.split(enlace).length === 2, 'Debe incluir una sola vez el enlace a la galería');
});

probar('crea una galería privada y devuelve su enlace con token', async () => {
  const llamadas = [];
  const supabase = {
    functions: {
      invoke: async (nombre, opciones) => {
        llamadas.push({ nombre, opciones });
        return { error: null };
      }
    }
  };
  const pedido = { nombre: '', ciudad: '', total: 25000, productos: [{ nombre: 'Media' }] };

  const enlace = await crearGaleriaPrivadaPedido(supabase, pedido);
  const llamada = llamadas[0];
  const token = llamada.opciones.body.token;

  afirmarIgual(llamada.nombre, 'pedido-galeria');
  afirmarIgual(llamada.opciones.body.accion, 'crear');
  afirmarIgual(llamada.opciones.body.pedido, pedido);
  afirmar(/^[A-Za-z0-9_-]{43}$/.test(token), 'Debe generar un token seguro de 43 caracteres');
  afirmar(enlace.includes('/paginas/galeria-pedido.html?token='), 'Debe devolver el enlace a la galería privada');
  afirmar(enlace.endsWith(encodeURIComponent(token)), 'El enlace debe incluir el token generado');
});

probar('crea un saludo predeterminado para un carrito sin datos de envío', () => {
  const mensaje = crearMensajePedido([], '', '');
  afirmar(mensaje.startsWith('¡Hola LONOTO! 👋'), 'Debe usar el saludo predeterminado');
  afirmar(mensaje.includes('$0 COP'), 'Debe informar un total de cero');
});

probar('detecta píxeles blancos según la tolerancia configurada', () => {
  afirmar(esPixelFondoBlanco(220, 220, 220, 255, 40), 'Debe eliminar blanco dentro del umbral');
  afirmar(!esPixelFondoBlanco(200, 240, 240, 255, 40), 'No debe eliminar un pixel que no es blanco');
  afirmar(!esPixelFondoBlanco(255, 255, 255, 0, 40), 'Debe preservar píxeles ya transparentes');
});

probar('construye la configuración 3D con sus valores de estado', () => {
  const estado = {
    baseColor: '#C9FF3E',
    imgScale: 80,
    imgX: 25,
    imgY: 60,
    imgRot: 15
  };
  afirmarIgual(crearConfiguracionDiseno({
    ...estado,
    duplicateImage: true
  }, 'data:image/png;base64,abc'), {
    colorBase: '#C9FF3E',
    escalaTextura: 80,
    posicionX: 25,
    posicionY: 60,
    rotacionTextura: 15,
    duplicarEstampado: true,
    texturaDataURL: 'data:image/png;base64,abc'
  });
  afirmarIgual(crearConfiguracionDiseno(estado, null).duplicarEstampado, false);
});

probar('incluye todas las vistas guardadas del diseño en el pedido', () => {
  const imagenes = [
    { etiqueta: 'Vista principal', ruta: 'galeria/imagen-1.jpg' },
    { etiqueta: 'Frente', ruta: 'galeria/imagen-2.jpg' },
    { etiqueta: 'Perfil Derecho', ruta: 'galeria/imagen-3.jpg' }
  ];
  const producto = crearProductoDisenoParaPedido({
    nombre_diseno: 'Media personalizada',
    configuracion_3d: { galeriaPrivada: { id: 'galeria', imagenes } }
  });

  afirmarIgual(producto.galeriaId, 'galeria');
  afirmarIgual(producto.imagenes, imagenes);
  afirmarIgual(producto.imagenes.length, 3);
});

probar('incluye el máximo de seis vistas incluyendo el logo original', () => {
  const imagenes = Array.from({ length: 6 }, (_, indice) => ({
    etiqueta: `Vista ${indice + 1}`,
    ruta: `galeria/imagen-${indice + 1}.jpg`
  }));
  const producto = crearProductoDisenoParaPedido({
    nombre_diseno: 'Media',
    configuracion_3d: { galeriaPrivada: { id: 'galeria', imagenes } }
  });

  afirmarIgual(producto.imagenes.length, 6);
});

probar('construye el mensaje de WhatsApp sin texto adicional del logo', () => {
  const mensaje = crearMensajePedidoDiseno({
    id_diseno: 15,
    nombre_diseno: 'Media personalizada',
    configuracion_3d: { colorBase: '#123456', urlLogoHD: 'https://ejemplo.test/logo.png' }
  }, 'https://ejemplo.test/galeria?token=privado');

  afirmar(mensaje.includes('#15'), 'Debe incluir la referencia del diseño');
  afirmar(mensaje.includes('https://ejemplo.test/galeria?token=privado'), 'Debe incluir la galería privada');
  afirmar(!mensaje.includes('DESCARGAR LOGO ORIGINAL HD'), 'No debe incluir el texto adicional del logo');
  afirmar(!mensaje.includes('https://ejemplo.test/logo.png'), 'No debe enviar el enlace separado del logo');
});

probar('avisa cuando un diseño guardado aún no tiene galería de vistas 3D', () => {
  let mensaje;
  try {
    crearProductoDisenoParaPedido({ configuracion_3d: {} });
  } catch (error) {
    mensaje = error.message;
  }
  afirmar(mensaje?.includes('guárdalo nuevamente'), 'Debe explicar cómo generar las vistas faltantes');
});

probar('guarda el diseño con usuario, nombre predeterminado y vista previa', async () => {
  const diseñoGuardado = { id_diseno: 7 };
  const { supabase, llamadas } = crearSupabaseFalso({
    respuestas: [{ data: [diseñoGuardado], error: null }]
  });
  const avisos = [];
  const servicio = crearServicioDisenos(supabase, { alertar: mensaje => avisos.push(mensaje) });
  const configuracion = { colorBase: '#ffffff' };

  const resultado = await servicio.guardarDiseñoActual('', configuracion, 'data:image/jpeg;base64,abc');
  const insercion = llamadas.find(llamada => llamada.metodo === 'insert');

  afirmarIgual(resultado, diseñoGuardado);
  afirmarIgual(insercion.registros[0], {
    id_usuario: 'usuario-1',
    id_producto_base: 1,
    nombre_diseno: 'Mi Diseño Lonoto',
    configuracion_3d: configuracion,
    url_vista_previa_3d: 'data:image/jpeg;base64,abc'
  });
  afirmar(avisos.includes('¡Diseño guardado exitosamente!'), 'Debe avisar que se guardó correctamente');
});

probar('no guarda un diseño sin sesión iniciada', async () => {
  const { supabase, llamadas } = crearSupabaseFalso({ user: null });
  const avisos = [];
  const servicio = crearServicioDisenos(supabase, { alertar: mensaje => avisos.push(mensaje) });

  afirmarIgual(await servicio.guardarDiseñoActual('Diseño', {}), null);
  afirmar(!llamadas.some(llamada => llamada.metodo === 'insert'), 'No debe insertar sin usuario');
  afirmar(avisos.includes('Debes iniciar sesión para guardar tu diseño.'), 'Debe avisar que requiere sesión');
});

probar('consulta los diseños del usuario en orden de creación descendente', async () => {
  const diseños = [{ id_diseno: 1 }];
  const { supabase, llamadas } = crearSupabaseFalso({
    respuestas: [{ data: diseños, error: null }]
  });
  const servicio = crearServicioDisenos(supabase);

  afirmarIgual(await servicio.obtenerMisDiseños(), diseños);
  afirmar(llamadas.some(llamada => llamada.metodo === 'eq'
    && llamada.campo === 'id_usuario' && llamada.valor === 'usuario-1'), 'Debe filtrar por el usuario');
  afirmar(llamadas.some(llamada => llamada.metodo === 'order'
    && llamada.campo === 'fecha_creacion'
    && llamada.opciones.ascending === false), 'Debe ordenar del más reciente al más antiguo');
});

probar('carga un diseño por identificador y evita consultas sin identificador', async () => {
  const diseño = { id_diseno: 9 };
  const { supabase, llamadas } = crearSupabaseFalso({
    respuestas: [{ data: diseño, error: null }]
  });
  const servicio = crearServicioDisenos(supabase);

  afirmarIgual(await servicio.cargarDiseñoEnEscena(null), null);
  afirmarIgual(await servicio.cargarDiseñoEnEscena(9), diseño);
  afirmar(llamadas.some(llamada => llamada.metodo === 'eq'
    && llamada.campo === 'id_diseno' && llamada.valor === 9), 'Debe consultar el ID solicitado');
});

probar('reporta el resultado de eliminar un diseño', async () => {
  const correcto = crearServicioDisenos(crearSupabaseFalso({
    respuestas: [{ data: null, error: null }]
  }).supabase);
  const fallido = crearServicioDisenos(crearSupabaseFalso({
    respuestas: [{ data: null, error: new Error('falló') }]
  }).supabase);

  afirmarIgual(await correcto.eliminarDiseño(4), true);
  afirmarIgual(await fallido.eliminarDiseño(4), false);
});

probar('sube una imagen y devuelve su URL pública', async () => {
  const archivo = { name: 'logo.png' };
  const { supabase, llamadas } = crearSupabaseFalso({
    respuestas: [{ data: null, error: null }],
    urlPublica: 'https://ejemplo.test/logo.png'
  });
  const servicio = crearServicioDisenos(supabase, { informarError: () => {} });

  afirmarIgual(await servicio.subirImagenStorage(null), null);
  afirmarIgual(await servicio.subirImagenStorage(archivo), 'https://ejemplo.test/logo.png');
  const subida = llamadas.find(llamada => llamada.metodo === 'upload');
  afirmar(subida.ruta.endsWith('.png'), 'Debe conservar la extensión del archivo');
  afirmarIgual(llamadas.find(llamada => llamada.metodo === 'getPublicUrl').ruta, subida.ruta);
});

probar('devuelve null y registra el error cuando falla la subida', async () => {
  const error = new Error('sin permisos');
  const { supabase } = crearSupabaseFalso({
    respuestas: [{ data: null, error }]
  });
  const errores = [];
  const servicio = crearServicioDisenos(supabase, {
    informarError: (mensaje, detalle) => errores.push({ mensaje, detalle })
  });

  afirmarIgual(await servicio.subirImagenStorage({ name: 'logo.png' }), null);
  afirmarIgual(errores[0].detalle, error);
});

let fallos = 0;
const lineas = [];

for (const prueba of pruebas) {
  try {
    await prueba.funcion();
    lineas.push(`OK  ${prueba.nombre}`);
  } catch (error) {
    fallos += 1;
    lineas.push(`FALLO  ${prueba.nombre}: ${error.message}`);
  }
}

lineas.push(`\n${pruebas.length - fallos}/${pruebas.length} pruebas correctas`);
resultados.textContent = lineas.join('\n');
resultados.className = fallos ? 'fallo' : 'correcto';
document.title = fallos ? 'Fallaron las pruebas de LONOTO' : 'Pruebas de LONOTO correctas';
