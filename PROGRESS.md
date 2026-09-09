*30/7-2026*

# Project Idea

The idea of this project is to be a mobile app for FC Växjö. FC Växjö is the football club of my wife's father. My wife's father is an elderly man that usually sticks to pen and paper. My idea is to make an app for him, the coaches, the players and the player's parents to keep track of:

- Schedules
- Player behaviour
- Attendance
- Find parent's contact information
- Get phone notification when schedule is changed

# Stack

The idea is to use:

- React Native (built on Expo)
- Java Spring Boot
- AWS
- PostgreSQL

React Native will be to make the UI of the app. I have chosen this to make the app crossplatform for Android and iOS since the users of the app are expected to have a variation of devices. Expo is supposed to be easier for junior developers like me to set up.

Java Spring Boot will be used to make the API service. Why Java? Because that's what I am currently studying at the moment and also it's a very stable language. Me coming from a security background - I like to have stable systems.

AWS (Amazon Web Services) will be used to store the database (PostgreSQL) and API. I have chosen AWS because that's what I have studied previously at school and I am most familiar with. For Version 1 I will keep PostgreSQL on my own computer first, and move it to AWS later when the basics work.

For the repository structure I will go for a monorepo where I keep everything inside one root folder on Github. Inside that I will have one folder for the API (the Java backend) and another folder for the UI (React Native).

I will not have microservices for several reasons:
- More services means more AWS usage and that means higher costs.
- As a junior developer I am trying to build something stable at first.
- Since FC Växjö belongs to my wife's father, if the app goes down entirely I know I won't be in major trouble. It doesn't mean I don't love him, I just know that I will survive the fall. 

Inside the API folder I will use layers: controller, service, repository and models. That keeps the code easier to read.

# Project Timeline

I won't build everything at once. As a junior developer I need to focus on understanding how the code works in the system. So I will build slowly and steady. I will divide the project in versions where I will have small goals to accomplish each version. I have no idea how long this will take. Taking into consideration that I work 12h a day, have a newborn at home and have some local responsibilities in my area - I hope to achieve a stable version of the app in 3-4 months.

# Project Rules

For this project I want to write as much code by myself as possible. I want to use AI as it is supposed to - to be a helper, not someone that takes over. Because every time AI takes over my work I tend to lose control of the project. So I have made rules for the Cursor AI to follow. They are the following:

- AI can't change the code without my permission each time.
- AI takes the role of a mentor. Its role is to guide me and teach me. Every time it wants to make a change it needs to tell me the reason behind each decision.
- After each milestone I want the AI to automatically commit and push to Github Repository.

# Github Branching

I will use the standard Github Flow. That means I create short-lived branches for each feature or fix, then I merge them into the master branch.

# Project Version 1

Status: In progress. The API runs, the `users` and `roles` tables exist in PostgreSQL, and the repository layer works. Controller and service are not built yet. 

For the initial version of the app I want to have some functions up and running at the end. I want the API to be able to:

- Create a user with a role (ADMIN or COACH does this in the UI)
- Change the user's role with PUT
- Fetch the user and showcase the user data through Postman
- The data should be stored in PostgreSQL locally

# API design diagrams (7/9-2026)

Work diagrams live in one file: `API/Diagrams/api-layers-and-roles.drawio`.

Same file, two pages (not two files). Why: both views belong to the same API. draw.io already uses page tabs. Git history stays on one path. Split into separate files later only if a diagram gets a different owner or grows huge.

Page 1 is layers. Page 2 is users and roles. Short labels, no teaching copy. I replaced the first teaching sketch with this.

## Layers

Request order: Client → Controller → Service → Repository → PostgreSQL.

Packages for Version 1:

- `controller/` UserController
- `service/` UserService
- `repository/` UserRepository, RoleRepository
- `model/` User, Role

Rules: calls only go down. The controller does not use a repository. `model` is shared data, not a fourth layer.

Version 1 endpoints on the controller:

- POST /users — create user with a role
- PUT /users/{id}/role — replace the role
- GET /users/{id} — fetch the user

## Users and roles

Two tables: `users` and `roles`. No join table. A user has exactly one role (`users.roleId`, required). Many users can share the same role (many PLAYERs).

Why one role for now: the create-user screen picks one role. PUT replaces it. PARENT + COACH on the same person is out of scope. We can add a join table later if we need several roles.

Role names (seed data, not created by users in Version 1):

- ADMIN
- COACH
- PLAYER
- PARENT

Who may create users and change roles:

- ADMIN → ADMIN, COACH, PLAYER, PARENT
- COACH → PLAYER, PARENT only (cannot grant ADMIN or COACH)
- PLAYER / PARENT → none

The first ADMIN is seed data. After that, only ADMIN and COACH use POST /users. Extra powers (schedules, attendance, notifications) come later. Version 1 only stores the user and the role.

# Spring Boot skeleton (7/9-2026)

I generated the API from start.spring.io (Maven, Java 21, Spring Boot 4, Web, JPA, Validation, PostgreSQL) and placed it in `API/` next to `Diagrams/`.

Local PostgreSQL 18 is installed. Database name: `fcvaxjo_db`. Cost: $0 (on my PC, not AWS).

The app starts with `.\mvnw.cmd spring-boot:run` and Tomcat listens on port 8080.

The database password is not in Git. It lives in `API/.env` (`DB_PASSWORD`). `application.properties` reads `${DB_PASSWORD}`. A library `springboot4-dotenv` loads the `.env` file. `.env` is in `.gitignore`. `.env.example` is committed with an empty key name only.

# User and Role models (7/9-2026)

I added the first Java models under `API/src/main/java/se/fcvaxjo/api/model/`:

- `Role.java` — id, name (name is unique)
- `User.java` — id, name, email (unique), roleId (required, column `role_id`)

They are JPA `@Entity` classes. `@Table` maps them to `roles` and `users`. `@Id` plus `@GeneratedValue(IDENTITY)` lets PostgreSQL fill in the id.

I first imported the wrong `@Id` (`org.springframework.data.annotation.Id`). That one is not for JPA/Postgres. The correct import is `jakarta.persistence.Id`.

I added Lombok (`@Getter`, `@Setter`) so I do not write get/set methods by hand. Lombok is only used at compile time. Cost: $0. Cost later: those methods are hidden until I remember they exist.

I also set `spring.jpa.hibernate.ddl-auto=update` for local Version 1. When I restarted the API, Hibernate created the two tables in `fcvaxjo_db`. I confirmed them in pgAdmin. They are empty. Next step after the models was the repository layer.

`ddl-auto=update` is fine on my PC. I will not use it on a real AWS database later, because it can change tables in ways that are hard to undo.

# Permissions vs a third table (9/9-2026)

Version 1 has **no** `permissions` table. `users` points at `roles`. What a role may do is Java `if`s in `UserService`. That already applies to every user with that role.

A permissions table is optional **later**, if those ifs get long. First try extra columns on `roles` (for example `can_see_parent_phones`). A `permissions` + `role_permissions` join is only if many named powers are shared across roles.

Sketch: `API/Diagrams/users-roles-permissions.drawio` (page 1 = now, page 2 = later). Permissions stay in the API (service + maybe DB flags). Not a separate cloud product. That work is later (GitHub issue #12), not Version 1.

# Repository layer (9/9-2026)

I added Spring Data JPA repositories under `API/src/main/java/se/fcvaxjo/api/repository/`:

- `RoleRepository` — `JpaRepository<Role, Long>` plus `findByName`
- `UserRepository` — `JpaRepository<User, Long>` plus `findByEmail`

They are interfaces, not classes. Spring builds the SQL from the method names. `Long` matches the `id` type on the models. `findByEmail` must match the `email` field on `User` (a method named `findByUsername` failed at startup because `User` has no `username`).

This layer only talks to PostgreSQL. No HTTP yet. The service will use `findByName` when creating a user with a role name like COACH.

How I start the API: from the `API` folder, `.\mvnw.cmd spring-boot:run`. I use the Maven wrapper because `mvn` is not on my PATH. The Cursor Run button started from the repo root, so it did not load `API/.env` and Hibernate could not log in to Postgres. Confirmed working: `Started ApiApplication`.

Next step is the service layer.
