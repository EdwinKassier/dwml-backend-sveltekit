#!/bin/bash
FROM --platform=linux/amd64 node:lts-alpine as builder
WORKDIR /app
#Installing pnpm as default paackage manager
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
COPY . .
RUN pnpm install
COPY . .
RUN pnpm install vite-plugin-svelte-inspector

# Copy over rest of the project files
COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["node","build"]