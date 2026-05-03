FROM node:latest AS base
WORKDIR /app
RUN corepack enable pnpm && corepack install -g pnpm
COPY pnpm-lock.yaml .
RUN pnpm fetch -P
ADD . .
RUN pnpm i --offline -P
RUN pnpm run build

FROM debian:stable-slim
RUN apt-get update && apt-get install -y wget curl # install wget & curl for in-container health checks
WORKDIR /app
COPY --from=base /app/build/node node
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "/app/node" ]
