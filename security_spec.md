# Security Specification - SUPPORT LINK BOX

## Data Invariants
1. A member must have a unique `member_number`.
2. An activity log must be linked to a valid `member_id`.
3. Admin profiles must be managed only by Super Admins.
4. Total points and streaks on a member document are system-derived and should ideally be protected from direct client modification, however for this first-turn implementation we will allow admins to update them but with strict validation.

## The Dirty Dozen Payloads (Targeting Vulnerabilities)
1. **Identity Spoofing**: Attempt to create a member as a non-admin.
2. **Identity Spoofing**: Attempt to create an admin profile for yourself.
3. **Identity Spoofing**: Attempt to update another admin's role.
4. **ID Poisoning**: Attempt to create a member with 1MB document ID.
5. **State Shortcutting**: Attempt to give a member 1,000,000 points in one update.
6. **Shadow Update**: Attempt to add a `isVerified: true` field to a member document.
7. **PII Leak**: Attempt to list all admin profiles as a regular user.
8. **Update Gap**: Attempt to update a member's streak without updating the `updated_at` timestamp.
9. **Relational Sync**: Attempt to add an activity log for a non-existent member.
10. **Terminal State**: Attempt to "un-archive" a member if that was supposed to be restricted (actually user said they can be restored).
11. **Denial of Wallet**: Attempt to write a 1MB string into the `notes` field.
12. **System Bypass**: Attempt to delete the `audit_trail` logs.

## Test Runner (Draft Plan)
Test file `firestore.rules.test.ts` will verify these scenarios.
 (Note: I will implement the rules first then the test file if required, but the instructions say to output the spec first).

## Conflict Report Logic
| Collection | Identity Spoofing | State Shortcutting | ID Poisoning |
|---|---|---|---|
| members | blocked by admin check | blocked by schema size | blocked by isValidId |
| activity_logs | blocked by admin check | 0/1 point check | blocked by isValidId |
| admin_profiles | Super Admin only | Immutable roles | blocked by isValidId |
| audit_trail | Append only | Read only | blocked by isValidId |
