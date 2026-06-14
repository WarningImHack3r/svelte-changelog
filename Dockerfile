FROM node:slim AS base
WORKDIR /app
RUN corepack enable
COPY pnpm-*.yaml .
RUN pnpm fetch -P
COPY . .
# "prefer" offline due to https://github.com/pnpm/pnpm/issues/11808
RUN pnpm i --prefer-offline && pnpm run build && pnpm i --prefer-offline -P

FROM node:slim
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/build build
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
