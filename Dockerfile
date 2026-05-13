# Step 1: Build Vite app
FROM node:lts-alpine AS client-build

WORKDIR /app

ENV CI=true
ENV NODE_ENV=production

COPY client/package.json client/pnpm-lock.yaml client/pnpm-workspace.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY client/ ./

RUN pnpm build


# Step 2: Build the server image and copy the built Vite app
FROM node:lts-alpine

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

COPY server/package.json server/pnpm-lock.yaml server/pnpm-workspace.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY server/ ./

COPY --from=client-build /app/dist ./public

EXPOSE 3000

CMD ["node", "src/main.js"]