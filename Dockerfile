FROM node:slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN npm i -g corepack && corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
# "prefer" offline due to https://github.com/pnpm/pnpm/issues/11808
RUN pnpm i --prefer-offline && pnpm run build && pnpm i --prefer-offline -P

FROM node:slim
WORKDIR /app
COPY --from=base /app/node_modules node_modules
COPY --from=base /app/build build
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
