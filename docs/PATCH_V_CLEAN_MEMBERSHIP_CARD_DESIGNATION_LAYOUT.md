# Patch V — Clean membership card designation layout

## Purpose

After Patch T, the active JAS designation was shown in a large green panel directly below the member name. This made the member name area feel crowded and also duplicated the designation in the information grid.

## Change

- Removed the large `JAS Designation` panel from below `Member Name`.
- Kept the designation in the normal information grid only.
- If a member has an active designation, the front card field shows:
  - `Designation` → active designation title
- If a member has no active designation, the same field stays:
  - `Profession` → profession value
- Back side still shows designation in member information.
- No database migration.

## Result

The membership card remains a normal membership card. The member name area stays clean, and designation appears as a standard member detail instead of looking like a separate office bearer badge/card.
