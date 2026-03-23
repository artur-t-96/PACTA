FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:8001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_ORIGIN=${NEXT_PUBLIC_BACKEND_ORIGIN}
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3002

CMD ["sh", "-c", "npx next start --port ${PORT:-3002}"]
