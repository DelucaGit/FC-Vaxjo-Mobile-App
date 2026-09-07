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
- Since FC Växjö belongs to my wife's father, if the app goes down entirely I know I won't be in major trouble.

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

For the initial version of the app I want to have some functions up and running at the end. I want the API to be able to:

- Create a user
- Append a role to the user
- Fetch the user and showcase the user data through Postman
- The data should be stored in PostgreSQL locally

# Progress log

## 2026-09-07 — Locked API structure (diagram)

We decided Version 1 API will use three layers:

1. Controller (HTTP)
2. Service (business rules)
3. Repository (database)

Roles will be a Java **enum** (not a record): `ADMIN`, `COACH`, `PARENT`, `PLAYER`.

Records will come later for request/response JSON (for example `CreateUserRequest`).

Diagram saved at: `docs/fcvaxjo-api-layers.drawio`  
Open it in [diagrams.net](https://app.diagrams.net/) or the Draw.io VS Code extension if you want to edit it.
