FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
# DevDependencies (TypeScript, etc.) are required for the compile stage.
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/
COPY packages/print/package.json packages/print/
COPY packages/testing/package.json packages/testing/
RUN npm ci

FROM deps AS build
ENV NODE_ENV=development
COPY . .
RUN npm run build -w @homeoassist/domain && \
    npm run build -w @homeoassist/print && \
    npm run build -w @homeoassist/api
RUN test -f apps/api/dist/server.js

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/print/package.json ./packages/print/package.json
COPY --from=build /app/packages/print/dist ./packages/print/dist
COPY --from=build /app/package.json ./package.json

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
