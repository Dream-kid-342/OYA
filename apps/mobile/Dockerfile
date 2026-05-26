# Stage 1: Build the Flutter Web application
FROM ghcr.io/cirruslabs/flutter:stable AS builder

WORKDIR /app

# Copy dependency files and fetch dependencies
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

# Copy the rest of the application
COPY . .

# Generate launcher icons before building
RUN dart run flutter_launcher_icons

# Build the web application
RUN flutter build web --release --web-renderer canvaskit

# Stage 2: Serve the application using NGINX
FROM nginx:alpine

# Copy the built artifacts from the builder stage
COPY --from=builder /app/build/web /usr/share/nginx/html

# Copy the custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
