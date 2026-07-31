---
title: "AngularJS to React (spec2cloud brownfield)"
description: "Modernize an AngularJS 1.x SPA to React 19 + TypeScript using the spec2cloud brownfield Spec-Driven Development workflow and GitHub Copilot"
authors: ["marconsilva", "alessandro-avila"]
category: "Code Modernization"
industry: "Cross-Industry"
services: ["Azure Static Web Apps", "Azure Functions"]
languages: ["JavaScript", "TypeScript"]
frameworks: ["React", "Vite"]
modernizationTools: ["spec2cloud"]
agenticTools: ["GitHub Copilot CLI", "GitHub Copilot Chat"]
tags: ["angularjs-migration", "spa-modernization", "typescript", "state-management", "spec-driven-development", "brownfield", "agentic-development"]
extensions: ["github.copilot", "github.copilot-chat"]
thumbnail: "https://raw.githubusercontent.com/alessandro-avila/appmodlab-angularjs-to-react/main/assets/thumbnail-gpt-image.png"
video: ""
version: "2.0.0"
---

## Overview

This lab walks you through modernizing a legacy AngularJS 1.x single-page application into a
fully typed, component-driven app built with **React 19** and **TypeScript** — using
[**spec2cloud**](https://github.com/EmeaAppGbb/spec2cloud) (brownfield flow, `vNext`) as the
Spec-Driven Development framework and **GitHub Copilot** as the execution engine.

Rather than asking an AI to "port this to React" file by file, you follow a disciplined
brownfield workflow: **B1 Extract** (document what the code actually does) → **B2 Spec-Enable**
(PRD + FRDs) → **Testability Gate** (can we run and test it?) → **Track A green baseline**
(behaviour captured as passing tests) → **path selection, assessment, planning** → **incremental
delivery**. An agentic orchestrator ("Ralph loop") drives the cycle and stops at
human-in-the-loop gates, so engineers approve every decision that changes meaning.

You will migrate routing, state management, API integration, and UI components while
*provably* preserving existing functionality — producing a maintainable, testable codebase
ready for production deployment on Azure Static Web Apps.

## The Legacy Application

The starting point is **GlobalTravel Corp — Corporate Travel Portal**, a full-featured AngularJS 1.6.x SPA that manages corporate travel workflows. It relies on UI-Router for navigation, Restangular for REST API calls, Bootstrap 3 for styling, jQuery/jQuery UI for DOM manipulation, and a Bower/Grunt toolchain — all patterns that have since been superseded by modern frameworks and bundlers. Its Karma test suite is red on arrival, which is exactly what makes the Testability Gate a real exercise rather than a formality.


### Application Entry Point

Users are greeted by a simple login screen before being routed to the main dashboard, which serves as the hub for every travel module.

![Login Page](assets/screenshots/01-login.png)
*The login screen uses mock authentication, storing a JWT in `localStorage` to gate access to the portal.*

![Dashboard](assets/screenshots/02-dashboard.png)
*The dashboard links to all five modules — Flights, Hotels, Itinerary, Travel Requests, and Expenses — each implemented as a separate UI-Router state.*

### Key Modules

The portal includes several data-rich modules with forms, filters, and API-driven result lists that must be faithfully recreated during the migration.

![Flight Search](assets/screenshots/03-flights.png)
*The flight search module features round-trip/one-way toggling, date pickers, cabin class selection, and dynamic search results — showcasing the complexity that must carry over to the modern stack.*

![Hotel Booking](assets/screenshots/04-hotels.png)
*Hotel booking combines destination search, date ranges, and guest/room selectors with card-based results, illustrating the rich interactive UI the legacy app provides.*

---

## Initial Application Screenshots

The following screenshots capture the original AngularJS 1.6.x application ("GlobalTravel Corp — Corporate Travel Portal") before modernization. The app uses UI-Router for navigation, Restangular for API calls, Bootstrap 3 for styling, and Bower/Grunt for build tooling.

### Login Page
![Login Page](assets/screenshots/01-login.png)
Simple mock login screen with an "Enter Portal" button. No form validation — authentication stores a JWT in `localStorage`.

### Dashboard
![Dashboard](assets/screenshots/02-dashboard.png)
Main portal hub with links to all five modules: Flights, Hotels, Itinerary, Travel Requests, and Expenses.

### Flight Search
![Flight Search](assets/screenshots/03-flights.png)
Round-trip / one-way toggle, origin/destination inputs, date pickers, cabin class selector, and passenger count. Search results populate below the form.

### Hotel Booking
![Hotel Booking](assets/screenshots/04-hotels.png)
Destination city, check-in/check-out dates, guest and room selectors with a search button. Results display hotel cards with ratings and amenities.

### Itinerary
![Itinerary](assets/screenshots/05-itinerary.png)
List/Timeline/Print view toggle for managing booked trips. Shows a loading spinner while fetching itinerary data from the API.

### Travel Requests
![Travel Requests](assets/screenshots/06-travel-request.png)
Filterable list (All/Pending/Approved/Rejected) with search. Includes a "New Request" button and a "Create Your First Request" empty-state prompt. Shows API error handling when the backend is unreachable.

### Expense Reconciliation
![Expense Reconciliation](assets/screenshots/07-expenses.png)
Status filter tabs (All/Draft/Pending/Approved/Rejected), search bar, date range filter, and a "New Report" button. Displays a loading state while fetching expense reports.
