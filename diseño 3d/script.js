// ==========================================
// MÓDULO 3D Y GESTIÓN DE CAPTURAS - LONOTO
// ==========================================
import { subirArchivoGaleria } from './disenosService.js';
import { crearConfiguracionDiseno, esPixelFondoBlanco } from '../js/disenoLogica.js';

const canvas = document.getElementById('textureCanvas');
const ctx = canvas.getContext('2d');
const brandMarkCanvas = document.createElement('canvas');
const brandMarkContext = brandMarkCanvas.getContext('2d');
const tintedBrandMarkCanvas = document.createElement('canvas');
const tintedBrandMarkContext = tintedBrandMarkCanvas.getContext('2d');
let brandMarkReady = false;
let tintedBrandMarkColor = null;

function getTintedBrandMark(color) {
  if (!brandMarkReady) return null;
  if (tintedBrandMarkColor === color) return tintedBrandMarkCanvas;

  tintedBrandMarkContext.clearRect(0, 0, tintedBrandMarkCanvas.width, tintedBrandMarkCanvas.height);
  tintedBrandMarkContext.drawImage(brandMarkCanvas, 0, 0);
  tintedBrandMarkContext.globalCompositeOperation = 'source-in';
  tintedBrandMarkContext.fillStyle = color;
  tintedBrandMarkContext.fillRect(0, 0, tintedBrandMarkCanvas.width, tintedBrandMarkCanvas.height);
  tintedBrandMarkContext.globalCompositeOperation = 'source-over';
  tintedBrandMarkColor = color;

  return tintedBrandMarkCanvas;
}

const state = {
  baseColor: '#ffffff',
  uploadedImage: null,
  processedImage: null, 
  imgScale: 80,
  imgX: 50, 
  imgY: 50, 
  imgRot: 0,
  duplicateImage: false,
  removeBg: true, 
  bgTolerance: 40
};

window.obtenerDataURLTextura = function() {
  return canvas ? canvas.toDataURL('image/png') : null;
};

window.obtenerConfiguracionActual = function() {
  return crearConfiguracionDiseno(state, window.obtenerDataURLTextura());
};

function updateTexture() {
  if (!canvas || !ctx) return;

  ctx.fillStyle = state.baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const footStart = canvas.width * 0.08;
  const footEnd = canvas.width * 0.25;
  const shaftStart = footEnd;
  const shaftEnd = canvas.width * 0.96;

  ctx.save();

  // El mapa UV del GLB ubica el pie entre U=0.08-0.25 y la caña después.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
  ctx.fillRect(footStart, 0, footEnd - footStart, canvas.height);

  for (let y = 0; y < canvas.height; y += 16) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(shaftStart, y, shaftEnd - shaftStart, 4);
  }

  // Canaletas más densas en el puño.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(canvas.width * 0.9, 0, canvas.width * 0.06, canvas.height);

  // Puntadas alternadas para dar al pie un acabado de tejido tipo toalla.
  for (let y = -2; y < canvas.height; y += 16) {
    for (let x = footStart; x < footEnd; x += 12) {
      const offset = (Math.floor((y + 2) / 16) % 2) * 6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.055)';
      ctx.fillRect(x + offset, y, 3, 4);
    }
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.fillRect(footEnd, 0, 2, canvas.height);
  ctx.restore();

  const imgToDraw = state.removeBg ? state.processedImage : state.uploadedImage;

  if (imgToDraw) {
    const targetSize = (state.imgScale / 100) * 380; 
    const baseTargetX = (state.imgX / 100) * canvas.width;

    const minY = targetSize * 0.5;
    const maxY = canvas.height * 0.55; 
    const targetY = minY + (state.imgY / 100) * (maxY - minY);
    
    const radians = (state.imgRot * Math.PI) / 180;

    const aspect = imgToDraw.width / imgToDraw.height;
    let drawW, drawH;
    if (aspect >= 1) {
      drawW = targetSize;
      drawH = targetSize / aspect;
    } else {
      drawH = targetSize;
      drawW = targetSize * aspect;
    }

    const offsets = [-canvas.width, 0, canvas.width];
    const imagePositionsY = [targetY];
    if (state.duplicateImage) {
      imagePositionsY.push((targetY + canvas.height / 2) % canvas.height);
    }

    // Continue each print across the UV seam at the back of the sock.
    imagePositionsY.forEach(imageY => {
      const verticalOffsets = [-canvas.height, 0, canvas.height];
      offsets.forEach(offset => {
        verticalOffsets.forEach(verticalOffset => {
          ctx.save();
          ctx.translate(baseTargetX + offset, imageY + verticalOffset);
          ctx.rotate(radians);
          ctx.drawImage(imgToDraw, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        });
      });
    });
  }

  // La marca permanece fija en el empeine y sobre cualquier estampado cargado.
  const baseHex = state.baseColor.match(/^#([0-9a-f]{6})$/i)?.[1];
  const baseRed = baseHex ? Number.parseInt(baseHex.slice(0, 2), 16) : 255;
  const baseGreen = baseHex ? Number.parseInt(baseHex.slice(2, 4), 16) : 255;
  const baseBlue = baseHex ? Number.parseInt(baseHex.slice(4, 6), 16) : 255;
  const logoColor = (baseRed * 0.2126 + baseGreen * 0.7152 + baseBlue * 0.0722) < 145
    ? '#ffffff'
    : '#111214';

  ctx.save();
  ctx.translate(canvas.width * 0.22, canvas.height * 0.4);
  ctx.rotate(Math.PI / 2);
  ctx.scale(0.82, 1);
  const logoImage = getTintedBrandMark(logoColor);
  if (logoImage) {
    const logoWidth = 114;
    const logoHeight = logoWidth * (logoImage.height / logoImage.width);
    const curveDepth = 4;
    const sliceWidth = 2;
    for (let x = 0; x < logoWidth; x += sliceWidth) {
      const width = Math.min(sliceWidth, logoWidth - x);
      const position = (x + width / 2) / logoWidth * 2 - 1;
      const curveOffset = curveDepth * (1 / 3 - position * position);
      ctx.drawImage(
        logoImage,
        x / logoWidth * logoImage.width,
        0,
        width / logoWidth * logoImage.width,
        logoImage.height,
        -logoWidth / 2 + x,
        -logoHeight / 2 + curveOffset,
        width,
        logoHeight
      );
    }
  } else {
    ctx.font = '34px "Permanent Marker", sans-serif';
    ctx.fillStyle = logoColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LoNoTo', 0, 0);
  }
  ctx.restore();

  if (window.customBaseTexture) {
    window.customBaseTexture.needsUpdate = true;
  }
}

function processUploadedImage() {
  if (!state.uploadedImage) return;

  if (!state.removeBg) {
    state.processedImage = state.uploadedImage;
    updateTexture();
    return;
  }

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = state.uploadedImage.width;
  tempCanvas.height = state.uploadedImage.height;
  tempCtx.drawImage(state.uploadedImage, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const a = data[i+3];
    
    if (esPixelFondoBlanco(r, g, b, a, state.bgTolerance)) data[i+3] = 0;
  }

  tempCtx.putImageData(imgData, 0, 0);

  const newImg = new Image();
  newImg.onload = function() {
    state.processedImage = newImg;
    updateTexture();
  };
  newImg.src = tempCanvas.toDataURL();
}

const brandMarkImage = new Image();
brandMarkImage.onload = function() {
  brandMarkCanvas.width = 768;
  brandMarkCanvas.height = 206;
  tintedBrandMarkCanvas.width = brandMarkCanvas.width;
  tintedBrandMarkCanvas.height = brandMarkCanvas.height;

  brandMarkContext.drawImage(brandMarkImage, 158, 59, 882, 237, 0, 0, brandMarkCanvas.width, brandMarkCanvas.height);
  const logoPixels = brandMarkContext.getImageData(0, 0, brandMarkCanvas.width, brandMarkCanvas.height);
  for (let i = 0; i < logoPixels.data.length; i += 4) {
    const brightness = (logoPixels.data[i] + logoPixels.data[i + 1] + logoPixels.data[i + 2]) / 3;
    logoPixels.data[i] = 255;
    logoPixels.data[i + 1] = 255;
    logoPixels.data[i + 2] = 255;
    logoPixels.data[i + 3] = Math.max(0, Math.min(255, Math.round((brightness - 20) * 1.12)));
  }
  brandMarkContext.putImageData(logoPixels, 0, 0);
  brandMarkReady = true;
  updateTexture();
};
brandMarkImage.onerror = function(error) {
  console.error('Error al cargar el logotipo Lonoto desde Inicio/Lonoto.jpeg:', error);
};
brandMarkImage.src = new URL('../Inicio/Lonoto.jpeg', import.meta.url).href;

updateTexture();

// --- CONFIGURACIÓN DE ESCENA THREE.JS ---
const container = document.getElementById('threeContainer');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111214'); 

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 100);
camera.position.set(0, 0, 0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
if (container) container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.15; 
controls.maxDistance = 0.9;  
controls.enablePan = true;   

const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(5, 5, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
topLight.position.set(0, 10, 0);
scene.add(topLight);

const customBaseTexture = new THREE.CanvasTexture(canvas);
customBaseTexture.wrapS = THREE.RepeatWrapping; 
customBaseTexture.wrapT = THREE.RepeatWrapping;
customBaseTexture.minFilter = THREE.LinearMipmapLinearFilter;
customBaseTexture.magFilter = THREE.LinearFilter;
customBaseTexture.flipY = false; 
window.customBaseTexture = customBaseTexture;

const sockMaterial = new THREE.MeshStandardMaterial({
  map: customBaseTexture,
  roughness: 0.92,
  metalness: 0,
  side: THREE.DoubleSide
});

window.renderizarEscena3D = function() {
  renderer.render(scene, camera);
};

window.tomarCaptura3D = function() {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/jpeg', 0.85);
};

window.tomarCapturasMultiples3D = async function() {
  const capturas = [];
  const angulos = [
    { name: 'Frente', x: 0, z: 0.5 },
    { name: 'Perfil Derecho', x: 0.35, z: 0.35 },
    { name: 'Espalda', x: 0, z: -0.5 },
    { name: 'Perfil Izquierdo', x: -0.35, z: 0.35 }
  ];

  const posXOriginal = camera.position.x;
  const posZOriginal = camera.position.z;

  for (let angulo of angulos) {
    camera.position.x = angulo.x;
    camera.position.z = angulo.z;
    camera.lookAt(0, 0, 0);
    
    if (controls) controls.update();
    renderer.render(scene, camera);

    const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.85);
    capturas.push({ angulo: angulo.name, url: dataUrl });
  }

  camera.position.x = posXOriginal;
  camera.position.z = posZOriginal;
  camera.lookAt(0, 0, 0);
  if (controls) controls.update();
  renderer.render(scene, camera);

  return capturas;
};

const loader = new THREE.GLTFLoader();
let currentModel = null;

loader.load(
  'media.glb',
  function (gltf) {
    const model = gltf.scene;
    currentModel = model;

    model.traverse((child) => {
      if (child.isMesh) {
        child.material = sockMaterial;
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material.map) {
          child.material.map.wrapS = THREE.RepeatWrapping;
          child.material.map.wrapT = THREE.RepeatWrapping;
          child.material.map.needsUpdate = true;
        }
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    scene.add(model);
    
    const loaderOverlay = document.getElementById('loaderOverlay');
    if (loaderOverlay) loaderOverlay.style.display = 'none';
    
    updateTexture();
  },
  undefined,
  function (error) {
    console.error("Error al cargar el archivo 3D:", error);
    const loaderOverlay = document.getElementById('loaderOverlay');
    if (loaderOverlay) {
      loaderOverlay.innerHTML = '<div style="color:#FF3D8A; font-weight:bold;">❌ ERROR AL CARGAR EL MODELO 3D (media.glb)</div>';
    }
  }
);

// UI Eventos
const colorBtns = document.querySelectorAll('.color-btn');
colorBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    colorBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.baseColor = this.getAttribute('data-color');
    updateTexture();
  });
});

const imageLoader = document.getElementById('imageLoader');
if (imageLoader) {
  imageLoader.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    window.archivoImagenActualGlobal = file;

    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        state.uploadedImage = img;
        processUploadedImage(); 
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const removeBgCheck = document.getElementById('removeBgCheck');
const toleranceContainer = document.getElementById('toleranceContainer');
const bgToleranceInput = document.getElementById('bgTolerance');
const tolVal = document.getElementById('tolVal');

if (removeBgCheck) {
  removeBgCheck.addEventListener('change', function(e) {
    state.removeBg = e.target.checked;
    if (toleranceContainer) toleranceContainer.style.display = state.removeBg ? 'block' : 'none';
    processUploadedImage();
  });
}

if (bgToleranceInput) {
  bgToleranceInput.addEventListener('input', function(e) {
    state.bgTolerance = e.target.value;
    if (tolVal) tolVal.textContent = e.target.value;
    processUploadedImage();
  });
}

const duplicateImageCheck = document.getElementById('duplicateImageCheck');
if (duplicateImageCheck) {
  duplicateImageCheck.addEventListener('change', function(e) {
    state.duplicateImage = e.target.checked;
    updateTexture();
  });
}

document.getElementById('imgScale')?.addEventListener('input', (e) => { 
  state.imgScale = e.target.value; 
  document.getElementById('scaleVal').textContent = e.target.value + '%';
  updateTexture(); 
});
document.getElementById('imgPosX')?.addEventListener('input', (e) => { 
  state.imgX = e.target.value; 
  document.getElementById('xVal').textContent = e.target.value + '%';
  updateTexture(); 
});
document.getElementById('imgPosY')?.addEventListener('input', (e) => { 
  state.imgY = e.target.value; 
  document.getElementById('yVal').textContent = e.target.value + '%';
  updateTexture(); 
});
document.getElementById('imgRot')?.addEventListener('input', (e) => { 
  state.imgRot = e.target.value; 
  document.getElementById('rotVal').textContent = e.target.value + '°';
  updateTexture(); 
});

window.addEventListener('reconstruirTextura3D', (e) => {
  const config = e.detail;

  if (config.colorBase) {
    state.baseColor = config.colorBase;
    colorBtns.forEach(btn => {
      if (btn.dataset.color === config.colorBase) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  if (config.escalaTextura) state.imgScale = config.escalaTextura;
  if (config.rotacionTextura) state.imgRot = config.rotacionTextura;
  if (config.posicionX) state.imgX = config.posicionX;
  if (config.posicionY) state.imgY = config.posicionY;
  if (typeof config.duplicarEstampado === 'boolean') {
    state.duplicateImage = config.duplicarEstampado;
    if (duplicateImageCheck) duplicateImageCheck.checked = state.duplicateImage;
  }

  if (config.texturaDataURL) {
    const img = new Image();
    img.onload = () => {
      state.uploadedImage = img;
      state.processedImage = img;
      updateTexture();
    };
    img.src = config.texturaDataURL;
  } else {
    updateTexture();
  }
});

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update(); 
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  if (container) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
});

// --- FUNCIÓN AUXILIAR PARA CONVERTIR DATAURL A FILE ---
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function crearMiniatura(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const thumbnail = document.createElement('canvas');
      thumbnail.width = 160;
      thumbnail.height = 160;
      const context = thumbnail.getContext('2d');
      const scale = Math.min(160 / image.width, 160 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.fillStyle = '#111214';
      context.fillRect(0, 0, 160, 160);
      context.drawImage(image, (160 - width) / 2, (160 - height) / 2, width, height);
      resolve(thumbnail.toDataURL('image/jpeg', 0.5));
    };
    image.onerror = () => reject(new Error('No se pudo preparar la vista previa del modelo.'));
    image.src = dataUrl;
  });
}

async function subirImagenGaleria(galleryId, file) {
  const extensiones = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  const extension = extensiones[file.type];
  if (!extension) {
    throw new Error('El logo debe ser una imagen JPG, PNG o WebP.');
  }
  const ruta = `${galleryId}/${crypto.randomUUID()}.${extension}`;
  return subirArchivoGaleria(file, ruta);
}

// --- ACCIÓN DE AÑADIR PROTOTIPO 3D AL CARRITO ---
const addToCartBtn = document.getElementById('addToCartBtn');
if (addToCartBtn) {
  addToCartBtn.addEventListener('click', async () => {
    addToCartBtn.disabled = true;
    const textoOriginal = addToCartBtn.innerText;
    addToCartBtn.innerText = '⏳ SUBIENDO CAPTURAS Y LOGO...';

    try {
      if (!currentModel) {
        throw new Error('El modelo 3D aún no está listo. Espera a que termine de cargar e inténtalo de nuevo.');
      }

      // Subir la vista principal y los ángulos a un bucket privado.
      const snapshotPrincipal = window.tomarCaptura3D();
      if (!snapshotPrincipal || !snapshotPrincipal.startsWith('data:image/')) {
        throw new Error('No se pudo generar la foto del modelo 3D. Inténtalo de nuevo.');
      }

      const galleryId = crypto.randomUUID();
      const galleryImages = [{
        label: 'Vista principal',
        path: await subirImagenGaleria(
          galleryId,
          dataURLtoFile(snapshotPrincipal, 'modelo-principal.jpg')
        )
      }];
      const capturasMultiples = window.tomarCapturasMultiples3D ? await window.tomarCapturasMultiples3D() : [];

      for (const captura of capturasMultiples) {
        galleryImages.push({
          label: captura.angulo,
          path: await subirImagenGaleria(
            galleryId,
            dataURLtoFile(captura.url, `modelo-${captura.angulo}.jpg`)
          )
        });
      }

      if (window.archivoImagenActualGlobal) {
        const file = window.archivoImagenActualGlobal;
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
        if (!extension) throw new Error('El logo debe ser una imagen JPG, PNG o WebP.');
        const logoFile = new File([file], `logo-original.${extension}`, { type: file.type });
        galleryImages.push({
          label: 'Logo original',
          path: await subirImagenGaleria(galleryId, logoFile)
        });
      }

      const miniatura = await crearMiniatura(snapshotPrincipal);
      const productoPersonalizado = {
        id: 'custom_' + Date.now(),
        nombre: 'MEDIA PERSONALIZADA 3D',
        precio: 25000,
        img: miniatura,
        cantidad: 1,
        esCustom: true,
        galleryId,
        galleryImages,
        detalles: {
          colorBase: state.baseColor,
          tieneGrafico: !!state.uploadedImage
        }
      };

      if (window.agregarAlCarrito) {
        await window.agregarAlCarrito(productoPersonalizado);
      }
    } catch (err) {
      console.error('Error al procesar producto:', err);
      alert(err instanceof Error
        ? `No se pudo preparar la galería privada: ${err.message}`
        : 'Hubo un error al subir los archivos a la nube.');
    } finally {
      addToCartBtn.disabled = false;
      addToCartBtn.innerText = textoOriginal;
    }
  });
}