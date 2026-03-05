# Specification (Draft)

## Problem
City staff need to capture, process, and track citizen requests.

## Core domain objects
- Citizen request
- Category
- Staff user
- Comment
- Status history

## Workflow
- NEW -> IN_PROGRESS | CLARIFICATION_NEEDED
- IN_PROGRESS -> CLARIFICATION_NEEDED | RESOLVED
- CLARIFICATION_NEEDED -> IN_PROGRESS
- RESOLVED -> CLOSED
- CLOSED is terminal
