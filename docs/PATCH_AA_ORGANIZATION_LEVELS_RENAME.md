# Patch AA — Rename Committees UI to Organization Levels

## Purpose

The designation workflow now uses the standard membership card, not a separate office bearer card. To reduce confusion, the admin committee setup UI is renamed to organization level/unit language.

## Changes

- Admin sidebar: `Committees` → `Organization Levels`
- Page title: `Committees & Designations` → `Organization Levels & Designations`
- `Create Committee` → `Create Level Unit`
- `Committee Type` → `Level`
- `Committee Name` → `Unit Name`
- `Committee Records` → `Level Units`
- `Manage Committee` → `Manage Unit`
- Detail page: `Committee Detail` → `Level Unit Detail`
- Assignment section: `Office Bearers` → `Assigned Designations`
- Search-area wording: `committee area` → `level unit area`

## Technical note

This is a UI wording patch only. The existing database tables and route paths remain unchanged:

- `organization_committees`
- `organization_committee_members`
- `/admin/committees`
- `/admin/committees/:id`

No database migration is required.
