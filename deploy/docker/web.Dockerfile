FROM node:26.10.0-alpine3.24 AS build
WORKDIR /source
COPY src/frontend/package.json src/frontend/package-lock.json ./
RUN npm ci
COPY src/frontend .
ARG VITE_SOCIAL_FACEBOOK_URL
ARG VITE_SOCIAL_WHATSAPP_URL
ARG VITE_SOCIAL_INSTAGRAM_URL
ARG VITE_SOCIAL_TIKTOK_URL
ENV VITE_SOCIAL_FACEBOOK_URL=${VITE_SOCIAL_FACEBOOK_URL} \
    VITE_SOCIAL_WHATSAPP_URL=${VITE_SOCIAL_WHATSAPP_URL} \
    VITE_SOCIAL_INSTAGRAM_URL=${VITE_SOCIAL_INSTAGRAM_URL} \
    VITE_SOCIAL_TIKTOK_URL=${VITE_SOCIAL_TIKTOK_URL}
RUN npm run build

FROM golang:1.26.7-alpine3.24 AS caddy-build
ARG CADDY_VERSION=v2.11.4
WORKDIR /build
COPY deploy/docker/caddy/main.go ./
RUN apk add --no-cache git \
    && go mod init lou-barbershop-caddy \
    && go get github.com/caddyserver/caddy/v2@${CADDY_VERSION} \
    && go get google.golang.org/grpc@v1.83.2 \
        golang.org/x/crypto@v0.56.0 \
        golang.org/x/net@v0.58.0 \
    && go mod tidy \
    && CGO_ENABLED=0 go build \
        -trimpath \
        -ldflags="-s -w" \
        -o /out/caddy \
        .

FROM alpine:3.24 AS runtime
RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates \
    && addgroup --gid 1000 caddy \
    && adduser --uid 1000 --ingroup caddy --disabled-password caddy \
    && install -d -o caddy -g caddy /config/caddy /data/caddy /srv
COPY --from=caddy-build /out/caddy /usr/bin/caddy
COPY deploy/docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /source/dist /srv
ENV XDG_CONFIG_HOME=/config \
    XDG_DATA_HOME=/data
EXPOSE 8080
USER 1000:1000
ENTRYPOINT ["caddy"]
CMD ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
