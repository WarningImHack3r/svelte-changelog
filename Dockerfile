FROM node:slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN npm i -g corepack && corepack enable
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
