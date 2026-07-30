# Base stage con dependencias comunes
FROM node:20.18-slim AS base
WORKDIR /app
COPY package*.json ./

# Stage de Desarrollo
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Stage de builder para producción
FROM base AS builder
ENV NODE_ENV=production
RUN npm install --omit=optional
COPY tsconfig.json ./
COPY src ./src
RUN rm -rf build
RUN npm run build

# Stage final de producción
FROM node:20.18 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "build/main.js"]

# Stage para producción local (mismo que producción pero con tag diferente para Docker Compose)
#FROM production AS production-local