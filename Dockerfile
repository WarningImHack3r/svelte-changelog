FROM node:slim AS base
WORKDIR /app
RUN npm i -g pnpm # install pnpm as it's not in the node image by default
COPY pnpm-lock.yaml .
RUN pnpm fetch
COPY . .
RUN pnpm i --offline
RUN pnpm run build
RUN pnpm i --offline -P

FROM debian:stable-slim
RUN apt-get update && apt-get install -y wget curl # install wget & curl for in-container health checks
WORKDIR /app
COPY --from=base /app/build/node node
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "/app/node" ]
