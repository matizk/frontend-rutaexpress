FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

ENV BFF_UPSTREAM=http://bff:8080
ENV NGINX_ENVSUBST_FILTER=^BFF_UPSTREAM$
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/25-validate-upstream.sh /docker-entrypoint.d/25-validate-upstream.sh
RUN chmod +x /docker-entrypoint.d/25-validate-upstream.sh
COPY --from=build /app/dist/rutaexpress-web/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
