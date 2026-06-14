FROM node:slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN npm i -g corepack && corepack enable
COPY pnpm-*.yaml .

FROM base AS prod-deps
RUN pnpm fetch -P
COPY . .
RUN pnpm i --prefer-offline --ignore-scripts -P

FROM base AS build
RUN pnpm fetch
COPY . .
# "prefer" offline due to https://github.com/pnpm/pnpm/issues/11808
RUN pnpm i --prefer-offline && pnpm run build

FROM node:slim
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/build build
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
