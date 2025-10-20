import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SdkService } from './sdk.service';

/**
 * Componente principal que muestra el formulario de registro de clientes.
 *
 * Ejemplos de uso:
 * // 1) Mostrar el formulario en la aplicación y obtener token automáticamente
 * // Al iniciar, el componente solicitará un token y lo pondrá en el campo correspondiente.
 *
 * // 2) Registrar un cliente desde la UI
 * // Completar nombre, email y token editable, luego pulsar 'Registrar'.
 *
 * // 3) Probar desde consola (usando métodos del servicio SDK)
 * // const token = await sdk.getToken();
 * // await sdk.registerClient({ name: 'Ana', email: 'a@e.com', token });
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  form = this.fb.group({
    token: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]]
  });

  status = '';

  constructor(private fb: FormBuilder, private sdk: SdkService) {
    this.loadToken();
  }

  /**
   * Solicita un token al servicio de seguridad y lo coloca en el formulario.
   *
   * Ejemplos:
   * // 1) Obtener el token al iniciar el componente
   * // El componente llamará automáticamente a loadToken() en el constructor.
   *
   * // 2) Forzar recarga de token manualmente
   * // await this.loadToken(); // actualizará el campo token
   *
   * // 3) Usar desde la consola para pruebas interactivas
   * // const c = document.querySelector('app-root') as any; c.componentInstance.loadToken();
   *
   * @returns {Promise<void>} No devuelve valor
   */
  async loadToken(): Promise<void> {
    try {
      const t = await this.sdk.getToken();
      this.form.patchValue({ token: t });
      this.status = 'Token obtenido correctamente.';
    } catch (err: any) {
      this.status = 'Error obteniendo token: ' + (err?.message || err);
    }
  }

  /**
   * Envía el formulario al backend mediante el SDK.
   *
   * Ejemplos:
   * // 1) Registro normal desde la UI
   * // Completa los campos y pulsa el botón Registrar que invoca onSubmit().
   *
   * // 2) Manejar errores de validación local
   * // Si el formulario es inválido, onSubmit mostrará un mensaje de error.
   *
   * // 3) Llamada manual para probar envío
   * // await this.sdk.registerClient({ name: 'Test', email: 't@t.com', token: '11111111' });
   *
   * @returns {Promise<void>} No devuelve valor
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.status = 'Formulario inválido, verificar datos.';
      return;
    }
    this.status = 'Enviando registro...';
    const { name, email, token } = this.form.value;
    try {
      const res = await this.sdk.registerClient({ name, email, token });
      if (res.ok) {
        this.status = 'Registro exitoso. ID: ' + res.id;
        this.form.patchValue({ name: '', email: '' });
      } else {
        this.status = 'Error: ' + (res.error || JSON.stringify(res));
      }
    } catch (err: any) {
      this.status = 'Error enviando registro: ' + (err?.message || err);
    }
  }
}
