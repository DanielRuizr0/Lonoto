// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://utqdeypdsoryinmarqpa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SRn8Cftpa30Pig-L-X4CIg_cLPiQIpQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: window.sessionStorage
  }
});

async function configurarCierreAlRetroceder() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('No se pudo verificar la sesión para el cierre al retroceder:', error);
    return;
  }

  if (!session) return;

  history.pushState({ lonotoAuthGuard: true }, '');
  window.addEventListener('popstate', event => {
    void cerrarSesionAlRetroceder(event);
  });
}

async function cerrarSesionAlRetroceder(event) {
  try {
    const esAvance = event.state?.lonotoAuthGuard;

    const { data: { session: sesionActual }, error: errorSesion } = await supabase.auth.getSession();
    if (errorSesion) {
      console.error('No se pudo verificar la sesión al retroceder:', errorSesion);
      return;
    }
    if (!sesionActual) {
      if (esAvance) {
        window.location.replace(new URL('../index.html', import.meta.url));
      }
      return;
    }
    if (esAvance) return;

    const { error: errorCierre } = await supabase.auth.signOut();
    if (errorCierre) {
      console.error('No se pudo cerrar la sesión al retroceder:', errorCierre);
      return;
    }

    window.location.replace(new URL('../index.html', import.meta.url));
  } catch (error) {
    console.error('No se pudo cerrar la sesión al retroceder:', error);
  }
}

void configurarCierreAlRetroceder().catch(error => {
  console.error('No se pudo configurar el cierre de sesión al retroceder:', error);
});