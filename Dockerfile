FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.25-alpine AS backend
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend /app/backend/public ./public
RUN CGO_ENABLED=0 go build -trimpath -o /server .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates && adduser -D app
USER app
COPY --from=backend /server /server
ENV PORT=8080 SECURE_COOKIES=true SEED_DEMO=true
EXPOSE 8080
ENTRYPOINT ["/server"]
