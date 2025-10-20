import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';

/**
 * Módulo principal de la aplicación Angular de registro de clientes.
 *
 * Incluye:
 * - ReactiveFormsModule para formularios reactivos
 * - HttpClientModule para llamadas HTTP desde el SDK/servicio
 */
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, ReactiveFormsModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

