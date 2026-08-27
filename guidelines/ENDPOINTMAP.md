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
