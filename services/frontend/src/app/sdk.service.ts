import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Servicio SDK para interactuar con los microservicios de security y clients.
 *
 * Métodos principales:
 * - getToken(): Promise<string>
 * - registerClient(payload): Promise<any>
 *
 * Ejemplos:
 * // 1) Obtener token
 * // const token = await sdk.getToken();
 *
 * // 2) Registrar cliente
 * // const res = await sdk.registerClient({ name: 'Ana', email: 'a@e.com', token: '11111111' });
 *
 * // 3) Usar en el componente para integrar con formularios
 * // await this.sdk.registerClient(this.form.value);
 */
@Injectable({ providedIn: 'root' })
export class SdkService {
  /** URL del microservicio de seguridad */
  public securityUrl = (window as any)['__env__']?.SECURITY_URL || 'http://localhost:3001';
  /** URL del microservicio de clientes */
  public clientsUrl = (window as any)['__env__']?.CLIENTS_URL || 'http://localhost:3002';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene un token de seguridad desde el microservicio de security.
   *
   * Ejemplos:
   * // 1) Llamada simple
   * // const t = await sdk.getToken();
   *
   * // 2) Uso en inicialización de componente
   * // this.sdk.getToken().then(t => this.form.patchValue({ token: t }));
   *
   * // 3) Manejo de errores
   * // try { await sdk.getToken(); } catch (e) { console.error(e); }
   *
   * @returns Promise<string> Token de 8 dígitos
   */
  async getToken(): Promise<string> {
    const obs = this.http.post<any>(`${this.securityUrl}/token`, {});
    const res = await firstValueFrom(obs);
    if (!res || !res.token) throw new Error('Respuesta inválida del servicio de seguridad');
    return res.token as string;
  }

  /**
   * Envía la solicitud de registro de cliente al microservicio de clients.
   *
   * Ejemplos:
   * // 1) Registro básico
   * // await sdk.registerClient({ name: 'Ana', email: 'a@e.com', token: '11111111' });
   *
   * // 2) Manejo de la respuesta
   * // const r = await sdk.registerClient(payload); if (r.ok) console.log('OK');
   *
   * // 3) Desde formularios Angular
   * // await this.sdk.registerClient(this.form.value);
   *
   * @param payload Objeto { name: string, email: string, token: string }
   * @returns Promise<any> Respuesta del microservicio
   */
  async registerClient(payload: { name: string; email: string; token: string }): Promise<any> {
    const obs = this.http.post<any>(`${this.clientsUrl}/clients/register`, payload);
    const res = await firstValueFrom(obs);
    return res;
  }
}

