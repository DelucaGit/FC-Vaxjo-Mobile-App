# FC Växjö API

A Spring Boot 4 REST API (Java 21) for FC Växjö. The project currently defines
domain models (`User`, `Player`, `Role`) under `api/src/main/java/se/fcvaxjo/api`.
There are no controllers/endpoints yet, so the running server responds to unknown
routes with Spring's structured JSON error (HTTP 404), which confirms the web
stack is serving requests.

## Cursor Cloud specific instructions

- The Maven project lives in the `api/` subdirectory, not the repo root. Run all
  Maven commands from there (for example `cd api`).
- Use the bundled Maven wrapper (`./mvnw`), not a system `mvn`. The wrapper is
  configured for Maven 3.9.16 and pins Java 21.
- Common commands (run from `api/`):
  - Compile / lint: `./mvnw -B clean compile`
  - Test: `./mvnw -B test`
  - Run in dev mode: `./mvnw spring-boot:run` (embedded Tomcat on port `8080`)
- No database or other external services are required to build, test, or run.
