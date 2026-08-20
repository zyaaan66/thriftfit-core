# ThriftFit — Backend

**Next.js 14 + Supabase + Stripe**

ThriftFit is a personal full-stack portfolio project focused on building a modern thrift fashion marketplace with a strong emphasis on backend architecture, product discovery, user fit matching, checkout flow, and payment security.

> **Note:** This is a personal/portfolio project, not a real commercial business.  
> The services used in this project, including Supabase and Stripe test mode, are intended for development, demonstration, and learning purposes. No real-money transactions are processed.
>
> Product images are placeholders/examples and do not represent products that are actually being sold.
>
> When presenting this project in a portfolio, CV, or interview, I describe it as a demonstration of full-stack engineering capabilities, particularly authentication, database design, product APIs, payment integration, webhook security, and transactional logic.

---
<img width="1912" height="903" alt="image" src="https://github.com/user-attachments/assets/632f6502-38a2-4049-8b8d-3ff55834b1a5" />

## Overview

ThriftFit is built around the idea of making thrift shopping more personalized by helping users find products that match their body measurements.

The backend implements:

- Supabase authentication
- PostgreSQL database
- Product catalog APIs
- User fit profiles
- Fit-Match Score algorithm
- Address management
- Cart/item holding mechanism
- Stripe payment integration
- Stripe webhook verification
- Product inventory locking
- Admin product creation
- Cloudinary image upload pipeline
- Row Level Security (RLS)

The current implementation follows the backend architecture defined in the project's master blueprint and includes the 15-minute product hold mechanism defined in the QA requirements.

---

# Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 | Backend API routes and application framework |
| TypeScript | Type-safe development |
| Supabase | PostgreSQL database and authentication |
| Stripe | Payment processing |
| Cloudinary | Product image storage and delivery |
| PostgreSQL | Relational data storage |
| Tailwind CSS | Frontend styling when used with the application |
| Vercel | Deployment target |

---

# Architecture

The main backend flow is:

```text
Client
  ↓
Next.js API Routes
  ↓
Authentication / Authorization
  ↓
Business Logic
  ↓
Supabase PostgreSQL
