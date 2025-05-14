# User Management System  

This project implements a robust user management system with secure authentication. Users can:  

- Register  
- Login  
- Logout  
- Request new JWT tokens  

## Features  

- **CRUD operations** on other users (Admin-only via RBAC)  
- Comprehensive **unit tests** during development  
- Follows **best practices** for security, architecture, and testing  
- **API Documentation** with Swagger UI

## Tech Stack  

- **Database**: PostgreSQL  
- **ORM**: TypeORM (Database interaction)  
- **Documentation**: Swagger/OpenAPI

## API Documentation

The API is documented using Swagger. Once the application is running, you can access the Swagger UI at:
[http://localhost:3000/api](http://localhost:3000/api)

This provides a complete interactive API documentation where you can:

- Browse all available endpoints
- See request and response schemas
- Test endpoints directly from the browser

The system enforces role-based access control (RBAC) where only admin users can perform CRUD operations on other users.
