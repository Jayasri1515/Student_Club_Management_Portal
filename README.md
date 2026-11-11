# Student Club Management Portal

A full-stack web application designed to simplify and manage college club activities. The Student Club Management Portal provides a centralized platform where administrators, club leaders, and students can manage clubs, memberships, and activities through role-based access.

## Project Overview

The Student Club Management Portal aims to improve student engagement and simplify club administration by bringing club-related operations into one application.

The system provides three types of user roles:

- **Admin:** Responsible for overall portal and club administration.
- **Club Leader:** Responsible for managing club-related activities.
- **Student:** Can explore clubs, participate in club activities, and manage membership interactions.

## Key Features

- Role-based access for Admin, Club Leader, and Student.
- User authentication and account management.
- Club browsing and membership management.
- Club activity management and activity display.
- REST API integration between frontend and backend.
- Centralized database management using MySQL.
- Responsive user interface.
- Notifications and modal-based user interactions.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 19 |
| Frontend Build Tool | Vite 7 |
| Backend | Java 21 |
| Backend Framework | Spring Boot 3.5.4 |
| Build Tool | Maven |
| Database | MySQL |
| API Architecture | REST APIs |
| Testing | JUnit / Maven, Vitest |
| Version Control | Git and GitHub |
| Development Tools | VS Code, IntelliJ IDEA |

## System Architecture

The application follows a client-server architecture.

1. **Frontend:** React application provides the user interface and interacts with backend services.
2. **Backend:** Spring Boot handles application logic, authentication, club operations, membership operations, and activity-related requests.
3. **Database:** MySQL stores application data.
4. **Communication:** REST APIs enable communication between the frontend and backend.

## Project Structure

The project maintains separate branches for frontend and backend development.

```text
Student_Club_Management_Portal/
│
├── Backend (back_end branch)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── .../
│   │   │   │       ├── controller/
│   │   │   │       ├── service/
│   │   │   │       ├── repository/
│   │   │   │       ├── model/
│   │   │   │       └── config/
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   ├── pom.xml
│   └── mvnw
│
└── Frontend (front_end branch)
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   └── ...
    ├── package.json
    ├── vite.config.js
    └── index.html
```

*Note: This is a conceptual structure. Actual package and folder names may differ.*

## Prerequisites

Install the following software before running the application:

- Java Development Kit (JDK) 21
- Node.js and npm
- MySQL Server
- Git
- Maven (optional if using Maven Wrapper)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Jayasri1515/Student_Club_Management_Portal.git

cd Student_Club_Management_Portal
```

### 2. Backend Setup

Switch to the backend branch:

```bash
git checkout back_end
```

Navigate to the directory containing `pom.xml`.

Configure the MySQL database connection in:

```text
src/main/resources/application.properties
```

Configure the following properties with your local database details:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/YOUR_DATABASE_NAME
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

Ensure the database exists and the application configuration is complete before starting the backend.

Run the backend application on Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Alternatively, if Maven is installed:

```bash
mvn spring-boot:run
```

The backend application runs at:

```text
http://localhost:8082
```

### 3. Frontend Setup

Clone the frontend branch into a separate directory:

```bash
git clone -b front_end https://github.com/Jayasri1515/Student_Club_Management_Portal.git Student_Club_Frontend
```

Navigate to the frontend project directory:

```bash
cd Student_Club_Frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend API base URL in the `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8082/api
```

Start the frontend development server:

```bash
npm run dev
```

The frontend development server is available at:

```text
http://localhost:5173
```

## API Overview

The backend exposes REST API endpoints for application operations.

The main controller areas include:

| Controller | Responsibility |
|---|---|
| Auth Controller | Authentication-related operations |
| Club Controller | Club-related operations |
| Activity Controller | Club activity operations |
| Membership Controller | Club membership operations |
| Hello Controller | Basic application endpoint |

The frontend communicates with the backend through the API base path:

```text
http://localhost:8082/api
```

Actual endpoint paths and request formats should be verified against the backend controller implementations.

## Testing

### Backend Testing

Navigate to the backend project directory and execute:

```bash
./mvnw test
```

On Windows:

```powershell
.\mvnw.cmd test
```

### Frontend Testing

Navigate to the frontend project directory and execute:

```bash
npm test
```

To run frontend lint checks:

```bash
npm run lint
```

## Development Workflow

The project uses Git and GitHub for version control and collaborative development.

- `back_end` – Backend development.
- `front_end` – Frontend development.
- Feature branches – Used for implementing individual enhancements.
- Pull Requests – Used for code review and controlled integration.

## Future Enhancements

Potential improvements include:

- Enhanced authentication and authorization.
- Improved membership lifecycle management.
- Additional club activity management operations.
- Expanded automated testing.
- Improved API documentation.
- CI/CD integration.

## Conclusion

The Student Club Management Portal provides a centralized solution for managing college clubs, memberships, and activities. By combining React, Spring Boot, and MySQL, the application demonstrates full-stack development, REST API integration, database management, and role-based application design.
