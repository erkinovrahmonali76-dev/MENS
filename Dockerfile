FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production DATA_DIR=/data TRUST_PROXY=1 COOKIE_SECURE=1
EXPOSE 3000
CMD ["node","server.js"]
