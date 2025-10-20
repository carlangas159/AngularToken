/**
 * SDK simple para el frontend (Angular/simplificado).
 *
 * Provee dos funciones principales:
 * - getToken(): obtiene un token de seguridad del microservicio de seguridad
 * - registerClient({ name, email, token }): envía el registro al microservicio de clientes
 *
 * Las URLs por defecto apuntan a http://localhost:3001 (security) y http://localhost:3002 (clients).
 * Ajusta `SDK.config` si es necesario.
 */
const SDK = (function () {
  /**
   * Configuración pública del SDK.
   * @type {{ securityUrl: string, clientsUrl: string }}
   */
  const config = {
    securityUrl: (window.SDK && window.SDK.config && window.SDK.config.securityUrl) || 'http://localhost:3001',
    clientsUrl: (window.SDK && window.SDK.config && window.SDK.config.clientsUrl) || 'http://localhost:3002'
  };

  /**
   * Obtiene un token de seguridad (8 dígitos) desde el microservicio de seguridad.
   *
   * Ejemplos:
   * // 1) Obtener token y mostrarlo
   * const t = await SDK.getToken();
   * console.log('Token:', t);
   *
   * // 2) Usar el token para pruebas en el formulario
   * document.getElementById('token').value = await SDK.getToken();
   *
   * // 3) Llamada desde consola para pruebas manuales
   * SDK.getToken().then(t => console.log(t)).catch(e => console.error(e));
   *
   * @returns {Promise<string>} Token de 8 dígitos
   */
  async function getToken() {
    const url = config.securityUrl + '/token';
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Error obteniendo token');
    const data = await res.json();
    if (!data || !data.token) throw new Error('Respuesta inválida del servicio de seguridad');
    return data.token;
  }

  /**
   * Envía al microservicio de clientes la solicitud de registro.
   *
   * Ejemplos:
   * // 1) Registro normal
   * const resp = await SDK.registerClient({ name: 'Ana', email: 'a@e.com', token: '12345678' });
   *
   * // 2) Manejar respuesta y errores
   * SDK.registerClient({ name:'X', email:'x@x.com', token:'00000000' }).then(r => console.log(r)).catch(e => console.error(e));
   *
   * // 3) Uso desde el formulario
   * // const body = { name: nameInput.value, email: emailInput.value, token: tokenInput.value };
   * // const r = await SDK.registerClient(body);
   *
   * @param {{ name: string, email: string, token: string }} payload Datos del cliente y token de seguridad
   * @returns {Promise<any>} Respuesta del microservicio de clientes
   */
  async function registerClient(payload) {
    const url = config.clientsUrl + '/clients/register';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      // devolver el payload de error para manejo en UI
      return data;
    }
    return data;
  }

  return {
    getToken,
    registerClient,
    config
  };
})();

// Hacer disponible globalmente
window.SDK = SDK;

