FROM node:slim AS base
WORKDIR /app
# install pnpm as it's not in the node image by default
RUN npm i -g pnpm
COPY pnpm-lock.yaml .
RUN pnpm fetch -P
COPY . .
RUN pnpm i --offline -P
RUN pnpm run build

FROM debian:stable-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libatomic1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=base /app/build/node node
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "/app/node" ]
