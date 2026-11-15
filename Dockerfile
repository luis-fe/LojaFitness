# syntax=docker/dockerfile:1
# =====================================================================
#  JLK Fitness e Casual — imagem de produção (Next.js 16 + API + scripts do banco)
#
#  Build:   docker build -t jlk-loja .
#  Rodar:   docker run -p 3000:3000 --env-file .env.local jlk-loja
#
#  No Railway: o Dockerfile na raiz é detectado automaticamente.
#  O comando de pré-deploy "node scripts/db.mjs deploy" prepara o banco.
# =====================================================================

ARG NODE_VERSION=22

# ---------- 1) Dependências ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2) Build ----------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis NEXT_PUBLIC_* são gravadas no código do navegador durante o build.
# O Railway as repassa como build args automaticamente.
ARG NEXT_PUBLIC_WHATSAPP_NUMERO
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_WHATSAPP_NUMERO=$NEXT_PUBLIC_WHATSAPP_NUMERO \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- 3) Execução (imagem final, enxuta) ----------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Usuário sem privilégios (mais seguro que rodar como root)
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Servidor Next.js "standalone" + arquivos estáticos
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Scripts do banco (pré-deploy e criação de vendedores) e o que eles importam
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/db ./db
COPY --from=build --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=build --chown=nextjs:nodejs /app/src/server/utils/senha.js /app/src/server/utils/validacao.js ./src/server/utils/

USER nextjs
EXPOSE 3000

# O Railway define PORT; o server.js do Next usa PORT e HOSTNAME
CMD ["node", "server.js"]
