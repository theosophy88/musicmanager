FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# The built files are emitted to /app/dist
# The docker-compose volume or multi-stage copy places them in backend/static
FROM scratch AS export
COPY --from=build /app/dist /dist
