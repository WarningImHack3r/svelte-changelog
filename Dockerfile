FROM node:slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -f -g corepack@latest && corepack enable
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

FROM debian:stable-slim
RUN apt-get update && apt-get install -y wget curl # install wget & curl for in-container health checks
WORKDIR /app
COPY --from=base /app/build/node node
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "/app/node" ]
