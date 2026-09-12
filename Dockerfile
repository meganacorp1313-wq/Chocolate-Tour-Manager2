FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile

# vite.config.ts requires both of these to be present even for a static build.
ENV NODE_ENV=production \
    PORT=18470 \
    BASE_PATH=/

RUN pnpm --filter @workspace/choco-tours run build \
 && pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    STATIC_DIR=/app/public

COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/artifacts/choco-tours/dist/public ./public

USER node

EXPOSE 8080

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
