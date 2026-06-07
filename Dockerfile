FROM node:slim AS base
WORKDIR /app
# install pnpm as it's not in the node image by default
RUN npm i -g pnpm
COPY pnpm-lock.yaml .
RUN pnpm fetch -P
COPY . .
RUN pnpm i --prefer-offline -P # "prefer" offline due to https://github.com/pnpm/pnpm/issues/11808
RUN pnpm run build

FROM node:slim
WORKDIR /app
# minimal requirement to avoid requiring a node image and make the SEA work
# RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 \
#     && rm -rf /var/lib/apt/lists/*
COPY --from=base /app/node_modules node_modules
COPY --from=base /app/build build
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
