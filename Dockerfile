FROM node:slim AS base
WORKDIR /app
# install pnpm as it's not in the node image by default
RUN npm i -g pnpm
COPY pnpm-*.yaml .
RUN pnpm fetch -P
COPY . .

FROM base as prod-deps
# "prefer" offline due to https://github.com/pnpm/pnpm/issues/11808
RUN pnpm i --prefer-offline -P

FROM base as build
RUN pnpm i --prefer-offline && pnpm run build

FROM node:slim
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/build build
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
