# Build Expo web export, then serve with nginx.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Browser on your computer calls the API via localhost:8080
ARG EXPO_PUBLIC_API_URL=http://localhost:8080
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npx expo export --platform web

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
