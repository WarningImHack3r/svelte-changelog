FROM node:slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends jq curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json .
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION="$(jq -r '.packageManager // "" | split("@")[1] // "latest" | split("+")[0]' package.json)" ENV="$HOME/.shrc" SHELL="$(which sh)" sh - \
    && rm package.json \
    && source $HOME/.shrc
COPY pnpm-*.yaml .
RUN pnpm fetch
COPY . .
# "prefer" offline due to https://github.com/pnpm/pnpm/issues/11808
RUN pnpm i --prefer-offline && pnpm run build

FROM debian:stable-slim
WORKDIR /app
# minimal requirement to avoid requiring a node image and make the SEA work
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=base /app/build/node node
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "/app/node" ]
