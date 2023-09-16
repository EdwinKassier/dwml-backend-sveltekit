#!/bin/bash
FROM --platform=linux/amd64 node:lts-alpine as builder
#Installing pnpm as default paackage manager
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

RUN pnpm install @esbuild/linux-x64

# Copy over rest of the project files
COPY . .

RUN npx prisma generate 

RUN pnpm run build

EXPOSE 3000

CMD ["node","build"]