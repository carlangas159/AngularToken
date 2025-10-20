/**
 * Polyfills para Angular
 *
 * Angular (por defecto) necesita Zone.js para gestionar la detección de cambios.
 * Aquí importamos la implementación de Zone que el build espera encontrar.
 *
 * Ejemplos de uso:
 * // 1) Mantener la compatibilidad con APIS de Angular que usan Zone
 * // 2) Evitar errores en tiempo de ejecución durante el bootstrap del módulo
 * // 3) Incluir esta importación en entornos de desarrollo y producción
 */
import 'zone.js/dist/zone'; // Requerido por Angular

/** Polyfills placeholder para Angular. En aplicaciones reales incluirías los polyfills necesarios. */
