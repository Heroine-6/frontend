FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_KAKAO_MAP_KEY
ARG VITE_KAKAO_CLIENT_ID
ARG VITE_TOSS_CLIENT_KEY

ENV VITE_KAKAO_MAP_KEY=$VITE_KAKAO_MAP_KEY
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_TOSS_CLIENT_KEY=$VITE_TOSS_CLIENT_KEY

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER=CHAT_SERVER
