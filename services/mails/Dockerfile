# Stage 1: build TypeScript
FROM node:18-bullseye-slim as build
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Quitar dependencias de desarrollo para que node_modules contenga solo dependencias de producción
RUN npm prune --production

# Stage 2: runtime (production) - usar Debian slim para compatibilidad con node_modules
FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
# Copiar node_modules y artefactos compilados desde el build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Este servicio es un consumer (no expone puerto HTTP)
CMD ["node", "dist/index.js"]
