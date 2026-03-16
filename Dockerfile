# Etapa 1: Build do Frontend (React/Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copia os arquivos de dependência do frontend e instala
COPY frontend/package*.json ./
RUN npm install

# Copia o código do frontend e faz o build
COPY frontend/ ./
RUN npm run build

# Etapa 2: Configuração do Backend e Servidor Final
FROM node:20-alpine
WORKDIR /app

# Copia as dependências do backend
COPY backend/package*.json ./
RUN npm install --production

# Copia o código do backend
COPY backend/ ./

# Copia os arquivos estáticos compilados do frontend para o backend servir
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Cria o diretório onde os dados persistentes serão salvos (mapeado no docker-compose)
RUN mkdir -p /app/data

# Expõe a porta do servidor Node.js
EXPOSE 8080

# Inicia o servidor backend
CMD ["node", "server.js"]
