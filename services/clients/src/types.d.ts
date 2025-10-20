/// <reference types="node" />

// Shims para módulos que pueden no estar presentes en el entorno local de verificación
declare module 'fastify';
declare module '@fastify/cors';
declare module 'ioredis';
declare module 'amqplib';

