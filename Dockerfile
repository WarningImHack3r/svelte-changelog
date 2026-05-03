FROM node:slim AS base
WORKDIR /app
RUN npm i -g pnpm # install pnpm as it's not in the node image by default
COPY pnpm-lock.yaml .
RUN pnpm fetch -P
COPY . .
RUN pnpm i --offline -P
RUN pnpm run build

FROM debian:stable-slim
WORKDIR /app
RUN apt-get update && apt-get install -y wget curl # install wget & curl for in-container health checks
COPY --from=base /lib/ld-linux-aarch64.so.1 /lib/ld-linux-aarch64.so.1
COPY --from=base \
  /lib/aarch64-linux-gnu/libatomic.so.1 /lib/aarch64-linux-gnu/libdl.so.2      \
  /lib/aarch64-linux-gnu/libm.so.6      /lib/aarch64-linux-gnu/libstdc++.so.6  \
  /lib/aarch64-linux-gnu/libgcc_s.so.1  /lib/aarch64-linux-gnu/libpthread.so.0 \
  /lib/aarch64-linux-gnu/libc.so.6      /lib/aarch64-linux-gnu/ \
  /app/build/node ./
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "/app/node" ]
