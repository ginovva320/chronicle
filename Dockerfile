# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS web-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_GOOGLE_MAPS_API_KEY=""
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
RUN npm run build

FROM golang:1.24-alpine AS api-build
WORKDIR /app

RUN apk add --no-cache build-base

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=web-build /app/dist ./dist

RUN CGO_ENABLED=1 GOOS=linux go build -o /out/travelog ./main.go

FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates sqlite-libs && \
    addgroup -S app && adduser -S app -G app

COPY --from=api-build /out/travelog /app/travelog
COPY --from=web-build /app/dist /app/dist

RUN mkdir -p /data && chown -R app:app /app /data

USER app

ENV CHRONICLE_HOST=0.0.0.0
ENV CHRONICLE_PORT=8572
ENV CHRONICLE_DB_PATH=/data/travelog.db
ENV CHRONICLE_SEED=false

EXPOSE 8572

ENTRYPOINT ["/app/travelog"]
