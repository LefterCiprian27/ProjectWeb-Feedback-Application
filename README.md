Gheorge Radu

Lefter Ionut Ciprian

Group 1105

# Project: Continuous Feedback Application

This project is a Single Page Application (SPA) that allows professors to receive anonymous, real-time feedback from students during an activity (lecture, seminar, lab).

## Table of Contents

1.  [Project Description](#1-project-description)
2.  [Core Functionality](#2-core-functionality)
3.  [Fulfilling General Requirements](#3-fulfilling-general-requirements)
4.  [Technical Architecture (REST & WebSockets)](#4-technical-architecture)
5.  [Technology Stack](#5-technology-stack)
6.  [Database Schema](#6-database-schema)
7.  [Project Plan and Deliverables](#7-project-plan-and-deliverables)
8.  [Setup and Run Instructions](#8-setup-and-run-instructions)

---

### 1. Project Description

*Objective:* To create a web platform that facilitates an instant and anonymous communication channel between students and professors during educational activities.

*The Problem:* In a typical classroom (physical or virtual), it is difficult for a professor to gauge the students' level of understanding or engagement in real-time. Students may be reluctant to ask questions or express confusion.

*The Solution:* A simple application where the professor creates a feedback session, and students can anonymously send reactions (emoticons). The professor views these reactions in a continuous stream, allowing them to adjust their pace or explanations accordingly.

---

### 2. Core Functionality

#### As a Professor:

- *Authentication:* The professor can authenticate into the application using an account (e.g., Google OAuth) to manage their activities.
- *Create Activity:* Can define a new activity with a date, description, and a start/end time.
- *Generate Unique Code:* Upon creating an activity, a unique access code (e.g., XYZ123) is generated.
- *View Real-Time Stream:* During the activity, the professor has a dashboard showing a live stream of all reactions sent by students, each with a timestamp.
- *View Report:* After the activity ends, the professor can review an aggregated report or a timeline of the received feedback.

#### As a Student:

- *Anonymous Participation:* The student does not need an account. They can access the application and enter the unique code received from the professor.
- *Feedback Interface:* After entering the code, the student has access to a simple interface consisting of 4 buttons (e.g., 🙂 Smiley, 😕 Confused, 😮 Surprised, 😞 Frowny).
- *Send Feedback:* The student can press any of the buttons at any time. Each press is sent as an individual event to the server.

---

### 3. Fulfilling General Requirements

This project is designed to meet all imposed technological constraints:

- *[✔] Front-end SPA:* The interface will be a *Single Page Application* built with *React.js*.
- *[✔] Back-end Node.js:* The backend is implemented in *Node.js*.
- *[✔] REST Interface:* The backend will expose a *RESTful* interface (using *Express.js*) for non-real-time operations (authentication, creating/reading activities, fetching reports).
- *[✔] Relational Database + ORM:* Storage will be handled by a relational database (*PostgreSQL). Data access will be managed via an ORM (Sequelize*).
- *[✔] External Service:* To fulfill this requirement, we will use *Google OAuth (via Passport.js)* as an external service for professor authentication. This manages identity and secures access to activity-creation functions.
- *[✔] Git Versioning:* The project is versioned in this Git repository, with incremental commits.
- *[✔] Server Deployment:* The final application will be deployed using a free tier (e.g., *Vercel* for the front-end and *Render* for the back-end and PostgreSQL database).
- *[✔] Code Quality:* The code will be organized, documented (JSDoc comments), and will use a consistent naming standard (camelCase).

---

### 4. Technical Architecture

The project requires a *hybrid* architecture to manage both standard operations (REST) and real-time communication (WebSockets).

#### A. RESTful API (for Management)

These endpoints will be used for operations that do not require real-time updates.

- POST /api/auth/google (Professor: initiates login with the external Google service)
- GET /api/auth/callback (Professor: Google OAuth callback)
- GET /api/auth/me (Professor: checks authentication status)
- POST /api/activities (Professor: creates a new activity)
- GET /api/activities (Professor: lists all their activities)
- GET /api/activities/:id (Professor: gets details and historical feedback for an activity)
- POST /api/join (Student: validates an access_code for an activity)

#### B. Real-Time Service (WebSockets)

For the "continuous stream" of feedback, we will use *Socket.io*.

1.  *Connection:* Both the student (after entering the code) and the professor (when opening the dashboard) will connect to the WebSocket server and join a specific "room" for the activity (e.g., room_XYZ123).
2.  *Events:*
    - *Student (Client -> Server):* student:feedback
      - Payload: { type: 'confused' }
    - *Server (Server -> Client):* server:new_feedback
      - The server receives the student:feedback event.
      - It saves it to the database (in the FeedbackEvents table) with a timestamp.
      - It broadcasts a new event to all clients in the room (especially the professor).
      - Payload: { type: 'confused', timestamp: '2025-11-16T20:30:01Z' }

---

### 5. Technology Stack

- *Front-end:* React.js
- *Back-end:* Node.js, Express.js
- *Real-time:* Socket.io
- *Database:* PostgreSQL
- *ORM:* Sequelize
- *Authentication:* Passport.js (with Google OAuth 2.0 strategy)
- *Deployment:* Vercel (Front-end), Render (Back-end + DB)

---

### 6. Database Schema

We will use 3 main tables:

1.  **Professors**

    - id (PK)
    - googleId (String, unique)
    - email (String)
    - displayName (String)

2.  **Activities**

    - id (PK)
    - professorId (FK, references Professors)
    - title (String)
    - description (Text)
    - accessCode (String, unique)
    - startTime (Timestamp)
    - endTime (Timestamp)

3.  **FeedbackEvents**
    - id (PK)
    - activityId (FK, references Activities)
    - feedbackType (String, e.g: 'smiley', 'confused')
    - timestamp (Timestamp)
