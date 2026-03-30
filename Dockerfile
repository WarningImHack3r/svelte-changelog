FROM node:slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g corepack@latest && corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:slim
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/build build
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
