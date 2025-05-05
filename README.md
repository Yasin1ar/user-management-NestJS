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

## Tech Stack  

- **Database**: PostgreSQL  
- **ORM**: TypeORM (Database interaction)  

The system enforces role-based access control (RBAC) where only admin users can perform CRUD operations on other users.
