document.addEventListener('DOMContentLoaded', () => {
  const botonesAgregar = document.querySelectorAll('.btn-agregar-carrito');

  botonesAgregar.forEach(boton => {
    boton.addEventListener('click', () => {
      const nombre = boton.getAttribute('data-nombre');
      const precio = parseFloat(boton.getAttribute('data-precio'));
      const img = boton.getAttribute('data-img');

      const producto = {
        nombre: nombre,
        precio: precio,
        img: img,
        cantidad: 1,
        esCustom: false
      };

      if (window.agregarAlCarrito) {
        window.agregarAlCarrito(producto);
      }

      const textoOriginal = boton.textContent;
      boton.textContent = '¡AGREGADO!';
      boton.style.backgroundColor = '#ffffff';
      setTimeout(() => {
        boton.textContent = textoOriginal;
        boton.style.backgroundColor = '';
      }, 800);
    });
  });
});