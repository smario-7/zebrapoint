FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

ARG VITE_API_URL=https://zebrapoint.net/api
ARG VITE_WS_URL=wss://zebrapoint.net
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
