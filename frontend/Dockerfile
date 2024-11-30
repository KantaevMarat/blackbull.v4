FROM node:18-alpine AS build

WORKDIR /app
COPY package.json package.json
RUN npm install
COPY . .
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/sites-enabled/default
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]