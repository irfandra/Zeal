# Build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app
# Install mysql-client for DB troubleshooting
RUN apt-get update && apt-get install -y mysql-client && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/*.jar app.jar
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/backend-entrypoint.sh"]
