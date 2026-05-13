# Security Specification - Badminton Pro

## Data Invariants
1. A match must belong to a court.
2. Scores cannot be negative.
3. Sets cannot exceed 3 (Best of 3).
4. Status must be one of: 'upcoming', 'live', 'finished'.

## The Dirty Dozen (Test Payloads)
1. Negative score: `{ scoreA: -1 }` -> DENY
2. Invalid status: `{ status: 'paused' }` -> DENY
3. Large court name: `{ court: 'Sân ' + 'x'.repeat(1000) }` -> DENY
4. Updating immutable court: `{ court: 'Sân 2' }` on an existing Sân 1 match -> DENY
5. Setting wins to 5: `{ setsA: 5 }` -> DENY
6. Extra fields: `{ scoreA: 10, malicious: true }` -> DENY (via hasOnly)
7. Spoofing updatedAt: `{ updatedAt: '2020-01-01' }` (not server time) -> DENY
8. Unauthenticated write: Any write without auth -> DENY
9. Non-admin creating match: Any create by non-admin -> DENY
10. Referee changing teams: `{ teamA: 'New Team' }` -> DENY
11. Updating finished match: Any update after status is 'finished' -> DENY (except Admin)
12. Invalid ID poisoning: `{ matchId: '../..' }` -> DENY
