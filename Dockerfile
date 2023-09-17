#!/bin/bash
FROM --platform=linux/amd64 node:lts-alpine as builder
WORKDIR /app
#Installing pnpm as default paackage manager
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
COPY . .
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm install vite-plugin-svelte-inspector
RUN pnpm run build

FROM --platform=linux/amd64 node:lts-alpine
USER node:node
WORKDIR /app
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json .
# Copy over rest of the project files
COPY . .
EXPOSE 3000
CMD ["node","build"]