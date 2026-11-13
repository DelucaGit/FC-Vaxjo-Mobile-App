# Multi-stage build for the API (issue #68). See docs/docker.md.
# Stage 1 builds the jar with the Maven Wrapper and a full JDK.
# Stage 2 runs it on a small JRE image. Only the jar is copied over,
# so Maven, the source code and the build cache never reach the final image.
# No secrets here: DB_PASSWORD, JWT_SECRET and so on come from environment
# variables when the container starts.

# ---- Stage 1: build ----
FROM eclipse-temurin:21.0.13_9-jdk-noble AS build
WORKDIR /build

# Copy only what Maven needs to resolve dependencies first. Docker caches this
# layer, so a code change does not download every dependency again.
COPY mvnw pom.xml ./
COPY .mvn .mvn
# mvnw must have Unix line endings and be executable. .gitattributes already
# keeps it LF, but a Windows checkout without it would break the build.
# The wrapper's properties file gets the same cleanup for the same reason.
RUN sed -i 's/\r$//' mvnw .mvn/wrapper/maven-wrapper.properties && chmod +x mvnw
RUN ./mvnw -B dependency:go-offline

# Now the source code. Tests run in CI (mvnw verify), not in the image build.
COPY src src
RUN ./mvnw -B package -DskipTests \
    && cp target/api-*.jar app.jar

# ---- Stage 2: run ----
FROM eclipse-temurin:21.0.13_9-jre-noble
WORKDIR /app

# Run as a normal user, not root, so a bug in the app cannot change the container.
RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY --from=build --chown=app:app /build/app.jar /app/app.jar
USER app

# Spring reads PORT (Render sets it). Without PORT it listens on 8080.
EXPOSE 8080
# MaxRAMPercentage lets Java use most of the container's memory limit
# instead of the small default share.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
