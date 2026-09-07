# Teaching-period enrollment endpoints

All endpoints require a bearer token. Error responses use `{ "success": false, "message": "..." }`.

## POST `/api/auth/login` role identity

Role-specific public IDs are included consistently in both the signed JWT payload and login response data. These IDs are read from trusted database records, not the request body.

- Student: `userId`, `role`, and `studentId`.
- Lecturer: `userId`, `role`, and `lecturerId`.
- Admin/Super Admin: `userId` and `role`; the schema has no separate public admin ID.

Student JWT payload:

```json
{
  "userId": "internal-student-uuid",
  "role": "STUDENT",
  "studentId": "S202600001",
  "iat": 1787800000,
  "exp": 1787886400
}
```

Lecturer JWT payload:

```json
{
  "userId": "internal-lecturer-uuid",
  "role": "LECTURER",
  "lecturerId": "L123456",
  "iat": 1787800000,
  "exp": 1787886400
}
```

Lecturer login response data includes:

```json
{
  "token": "jwt",
  "userId": "internal-lecturer-uuid",
  "lecturerId": "L123456",
  "firstName": "Ada",
  "email": "ada@example.com",
  "role": "LECTURER"
}
```

The frontend can use each role's public ID directly with role-specific endpoints. In particular, a lecturer can call `GET /api/lecturer/:lecturerId` even when they have no assigned classes.

## PATCH `/api/auth/password`

Roles: `ADMIN`, `SUPER_ADMIN`, `LECTURER`, `STUDENT`.

Requires a valid bearer token. This endpoint changes the password of the currently authenticated user; no user ID or role is accepted in the request body. The account is selected using the trusted identity and role from the JWT.

Request body:

```json
{
  "oldPassword": "CurrentPassword123",
  "newPassword": "NewPassword456",
  "confirmPassword": "NewPassword456"
}
```

The three fields are required strings. The new password must contain at least eight characters, must match `confirmPassword`, and must differ from the old password. The backend verifies `oldPassword` against the stored bcrypt hash and stores only a newly generated bcrypt hash of `newPassword`.

Successful response:

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

Validation errors return `400`. An incorrect old password returns `401`; a missing or invalid bearer token also returns `401`. If the authenticated account no longer exists, the endpoint returns `404`.

## POST `/api/class`

Roles: `ADMIN`, `SUPER_ADMIN`.

The existing request body remains supported. `courseCode` resolves one reusable `Course`; `(semester, year)` resolves one `AcademicTerm`; and the new `Class` references both. Class codes are unique within an academic term and may be reused in another term.

When `(semester, year)` already exists, its term is reused and the following body is sufficient:

```json
{
  "classCode": "CS101-A",
  "courseCode": "CS101",
  "lecturerId": "L123456",
  "semester": "SEMESTER_1",
  "year": 2027,
  "scheduleDays": ["MONDAY", "WEDNESDAY"],
  "startTime": "09:00",
  "endTime": "10:30",
  "room": "B101",
  "maxCapacity": 40
}
```

If the term does not exist, `startDate` and `endDate` must also be supplied so the backend can create it without inventing dates:

```json
{
  "startDate": "2027-02-22",
  "endDate": "2027-06-20"
}
```

## GET `/api/class/available/terms`

Role: `STUDENT`.

This static route is registered before `GET /api/class/:id`. It returns current or future academic terms that contain at least one class whose course is active:

```json
{
  "success": true,
  "count": 1,
  "terms": [
    {
      "semester": "SEMESTER_1",
      "year": 2027,
      "startDate": "2027-02-22T00:00:00.000Z",
      "endDate": "2027-06-20T00:00:00.000Z",
      "isOpenForEnrollment": false
    }
  ]
}
```

The schema has no separate enrollment-window or term-status fields. `isOpenForEnrollment` therefore preserves existing policy and is true, inclusively, from `startDate` through `endDate`.

## GET `/api/class/available`

Role: `STUDENT`.

Optional query: `semester=SEMESTER_1|SEMESTER_2&year=YYYY`. Both values must be supplied together. The year must be four digits in the range 2000–2100. Invalid queries return `400`; an unknown requested term returns `404`. Omitting both values preserves current-term behavior.

The response is `{ success, count, selectedTerm, classes }`. `selectedTerm` contains semester, year, dates, and `isOpenForEnrollment`. Each class contains course, lecturer, academic term, schedule and room fields plus:

```json
{
  "maxCapacity": 40,
  "enrollmentCount": 20,
  "remainingCapacity": 20,
  "isFull": false,
  "availableToStudent": true,
  "unavailableReason": null
}
```

Only active courses assigned to the student's major are considered. Availability also reflects enrollment dates, capacity, prerequisites, current/completed enrollment in the course, schedule conflicts within the selected term, and the maximum of four ongoing courses per term. Course credit points (normally 12 CP) do not determine this enrollment limit. An existing term with no matching offerings returns `classes: []`.

## POST `/api/enrollment`

Role: `STUDENT`.

The request body is unchanged:

```json
{
  "classId": "class-uuid"
}
```

Enrollment remains attached to the selected class. The backend validates the active course, student's major, academic-term enrollment window, capacity, prerequisites, duplicate/current/completed course enrollment, the maximum of four ongoing courses in the selected term, and schedule conflicts against ongoing enrollments in the same academic term.

The checks and create/reactivate write execute in a serializable Prisma transaction with conflict retries, preventing concurrent requests from exceeding capacity. Capacity, duplicate enrollment, schedule conflict, and course-load conflicts return `409` with stable frontend-displayable messages.

## GET `/api/dashboard/admin`

Roles: `ADMIN`, `SUPER_ADMIN`.

Returns summary statistics for the admin dashboard and the current academic term:

```json
{
  "success": true,
  "dashboard": {
    "stats": {
      "totalStudents": 120,
      "totalLecturers": 18,
      "totalMajors": 6,
      "totalCourses": 42,
      "ongoingClasses": 15
    },
    "currentTerm": {
      "id": "academic-term-uuid",
      "semester": "SEMESTER_1",
      "year": 2027,
      "startDate": "2027-02-22T00:00:00.000Z",
      "endDate": "2027-06-20T00:00:00.000Z"
    }
  }
}
```

Student and lecturer totals exclude accounts with `INACTIVE` status. The course total includes only `ACTIVE` courses. `ongoingClasses` counts classes assigned to the current academic term. If no term contains the current date, `currentTerm` is `null` and `ongoingClasses` is `0`.

## GET `/api/dashboard/lecturer`

Role: `LECTURER`.

Requires a valid bearer token. The lecturer is identified from the authenticated user's `userId`; no lecturer ID is accepted in the request path or query. The endpoint returns the authenticated lecturer's profile, summary statistics for classes assigned to them in the current academic term, and the current academic term:

```json
{
  "success": true,
  "dashboard": {
    "lecturer": {
      "lecturerId": "L123456",
      "firstName": "Ada",
      "lastName": "Lovelace",
      "email": "ada@example.com",
      "department": "Computer Science"
    },
    "stats": {
      "currentClasses": 3,
      "totalEnrollments": 86
    },
    "currentTerm": {
      "id": "academic-term-uuid",
      "semester": "SEMESTER_1",
      "year": 2027,
      "startDate": "2027-02-22T00:00:00.000Z",
      "endDate": "2027-06-20T00:00:00.000Z"
    }
  }
}
```

`currentClasses` counts the lecturer's classes assigned to the term containing the current date. `totalEnrollments` counts only `ONGOING` enrollments in those classes. If no term contains the current date, both statistics are `0` and `currentTerm` is `null`. If the authenticated user has no lecturer record, the endpoint returns `404` with `Lecturer not found`.

## Attendance session constraints and corrections

Attendance occurrences use `ATTENDANCE_TIME_ZONE`, which defaults to `Australia/Sydney`. New sessions can start from `ATTENDANCE_START_EARLY_MINUTES` before the scheduled class start until `ATTENDANCE_END_GRACE_MINUTES` after the scheduled class end. Both allowances default to 15 minutes when omitted from the environment.

### POST `/api/attendance/sessions`

Role: `LECTURER`.

Request body:

```json
{
  "classId": "class-uuid"
}
```

The lecturer must own the class. A new session can only be created on a scheduled class day, inside the academic term, and within the configured start window. Each class can have only one attendance session for each local `occurrenceDate`.

When the occurrence already has an open session, the endpoint returns that session so the lecturer can continue it. It does not create another session, and resuming the existing session is allowed after the original start window on the same occurrence date. A closed occurrence cannot be replaced.

- New session: `201` with `{ success, message, session, resumed: false }`.
- Existing open session: `200` with `{ success, message, session, resumed: true }`.
- Existing closed session: `409`.

The returned session includes `occurrenceDate`, `startedAt`, `status`, and its class details.

### PATCH `/api/attendance/sessions/:sessionId/students/:studentId`

Role: `LECTURER`.

This endpoint creates or updates manual attendance only while the session is `OPEN`. The lecturer must own the class, and `studentId` is the student's public ID. Allowed statuses are `PRESENT` and `ABSENT`.

### PATCH `/api/attendance/sessions/:sessionId/corrections`

Roles: `LECTURER`, `ADMIN`, `SUPER_ADMIN`.

Lecturers can only correct attendance for their assigned classes. Admin and Super Admin accounts can correct any closed attendance session.

Request body:

```json
{
  "corrections": [
    {
      "studentId": "STU001",
      "expectedStatus": "ABSENT",
      "status": "PRESENT"
    }
  ]
}
```

The session must be `CLOSED`. The batch must contain at least one correction, each student may appear only once, and statuses must be `PRESENT` or `ABSENT`. Each requested status must differ from `expectedStatus`.

The response is `{ success, message, records }`, with records ordered like the request. All records are updated atomically with `method: "MANUAL"` and the same correction timestamp. If any record is invalid, missing, or no longer matches `expectedStatus`, the whole batch is rejected; stale data returns `409`.

### Attendance response additions

- Session responses and attendance histories include `occurrenceDate`.
- Closing a session still marks all unmarked enrolled students as `ABSENT` with method `SYSTEM` in the same transaction that closes the session.
