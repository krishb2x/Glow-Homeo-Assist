FROM node:22-alpine AS base

WORKDIR /app



FROM base AS deps

COPY package.json package-lock.json ./

COPY apps/api/package.json apps/api/

COPY apps/web/package.json apps/web/

COPY packages/domain/package.json packages/domain/

COPY packages/print/package.json packages/print/

RUN npm ci



FROM deps AS build

COPY . .

RUN npm run build -w @homeoassist/api



FROM node:22-alpine AS api

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules

COPY --from=build /app/apps/api/dist ./apps/api/dist

COPY --from=build /app/apps/api/package.json ./apps/api/

COPY --from=build /app/packages/domain ./packages/domain

COPY --from=build /app/packages/print ./packages/print

COPY --from=build /app/package.json ./package.json

EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]

