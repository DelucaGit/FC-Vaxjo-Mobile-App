*Last updated: 30/7-2026*  
**Current focus:** Project Version 1 (API users + roles, local PostgreSQL)

# Project Idea

This project is a mobile app for **FC Växjö**, the football club of my wife's father — an elderly man who usually sticks to pen and paper. I want an app for him, the coaches, the players, and the players' parents to keep track of:

- Schedules
- Player behaviour
- Attendance
- Find parent's contact information
- Get phone notification when schedule is changed

# Stack

- React Native (built on Expo)
- Java Spring Boot
- AWS
- PostgreSQL

**React Native / Expo:** UI of the app. Chosen for cross-platform Android and iOS (users will have mixed devices). Expo is easier for a junior developer to set up.

**Java Spring Boot:** API service. I am studying Java now; it is stable, and coming from a security background I like stable systems.

**AWS + PostgreSQL:** AWS will host the database (PostgreSQL) and API later. I chose AWS because I studied it at school and I am most familiar with it. Version 1 uses PostgreSQL **locally** first; AWS comes after that works.

# Repository & architecture

I will use a **monorepo**: one GitHub root folder with:

- `api/` — Java backend
- `ui/` — React Native (Expo)

I will **not** use microservices, because:

- More services means more AWS usage and higher costs
- As a junior developer I want something stable first
- Since FC Växjö belongs to my wife's father, if the app goes down entirely I won't be in major trouble

Inside `api/` I will use layered structure: controller, service, repository, models.

# Project Timeline

I won't build everything at once. I need to focus on understanding how the code works, so I will build slow and steady in versions with small goals each time. I have no idea how long this will take. With a 12h workday, a newborn at home, and local responsibilities, I hope to achieve a stable version of the app in 3–4 months.

# Project Rules

I want to write as much code myself as possible. AI should be a helper, not take over — when AI takes over I lose control of the project.

Detailed AI workflow lives in:

- `.cursor/rules/mentor-mode.mdc`
- `.cursor/rules/milestone-git.mdc`

In short: AI needs my permission before changing code, acts as a mentor and explains decisions, and after each milestone automatically commits and pushes to GitHub.

# GitHub Branching

I will use **GitHub Flow**: short-lived `feature/...` or `fix/...` branches, then merge into `master`.

# Project Version 1

Status: not started

When Version 1 is done, the API should be able to:

- Create a user
- Assign a role to the user
- Fetch a user and return the user data (verify with Postman)
- Store the data in PostgreSQL locally
