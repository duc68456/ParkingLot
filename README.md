This ParkingLot application is a full-stack system built to manage parking operations end-to-end with a strong focus on security, scalability, and real-world integrations. It features secure authentication and Role-Based Access Control (RBAC) across Admin, Staff, and Customer portals, implemented with JWT for session management and bcrypt for password hashing. On the data layer, the platform uses MongoDB with Mongoose to model scalable schemas for user accounts, vehicles, and parking entry/exit sessions, enabling efficient tracking and reporting. The Node.js backend is also integrated with a Python/Flask Automatic License Plate Recognition (LPR) microservice through REST endpoints, allowing seamless plate detection and verification as part of the parking workflow.

Account:

- Supreme Admin:
+ username: supremeadmin
+ password: supremeadmin

- Admin:
+ username: admin
+ password: admin123

- Manager:
+ username: manager
+ password: manager123

- Staff:
+ PIN code: 490385