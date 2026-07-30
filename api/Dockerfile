# Multi-stage build: compile with Maven, run a slim Java image.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache wget \
  && addgroup -S app && adduser -S app -G app

USER app

COPY --from=build /workspace/target/api-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
