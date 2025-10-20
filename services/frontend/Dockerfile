# Stage 1: build the Angular app
FROM node:18-bullseye-slim as build
WORKDIR /app

# Instala herramientas de compilación necesarias para dependencias nativas
RUN apt-get update && apt-get install -y build-essential python3 make g++ git ca-certificates curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Aumentar memoria para procesos npm/node en builds pesados
ENV NODE_OPTIONS="--max_old_space_size=4096"
ENV NPM_CONFIG_LOGLEVEL=verbose

# Copiar package.json y lockfile primero para aprovechar la cache
COPY package*.json ./
# Asegurarse de eliminar BOMs invisibles en package files antes de instalar
RUN for f in package*.json; do sed -i '1s/^\xEF\xBB\xBF//' "$f" || true; done \
  && (npm ci --legacy-peer-deps --loglevel verbose || npm install --legacy-peer-deps --loglevel verbose) \
  || (echo "--- NPM INSTALL FAILED - DUMPING LOGS ---" && ls -la /root/.npm/_logs || true && cat /root/.npm/_logs/*.log || true && exit 1)

# Copiar el resto de la app
COPY . .
# Limpiar BOMs en archivos fuente que puedan causar errores al loader
RUN find src -type f \( -name "*.css" -o -name "*.ts" -o -name "*.html" -o -name "*.json" \) -exec sed -i '1s/^\xEF\xBB\xBF//' {} \; || true

# Construir la aplicación
RUN npm run build --if-present

# Stage 2: serve with node
FROM node:18-bullseye-slim
WORKDIR /app

# Aumentar memoria para builds si se requiere
ENV NODE_OPTIONS="--max_old_space_size=4096"

# Copiar package.json primero para aprovechar cache
COPY package*.json ./

# Instalación de dependencias en la imagen final: usar `npm ci` si existe package-lock.json, si no usar `npm install`
RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/* \
  && if [ -f package-lock.json ]; then npm ci --legacy-peer-deps --loglevel=error; else npm install --legacy-peer-deps --loglevel=error; fi

# Copiar el resto del código
COPY . .

# Exponer el puerto de ng serve
EXPOSE 4200

# Ejecutar el servidor de desarrollo de Angular (ng serve)
CMD ["npm", "start"]
