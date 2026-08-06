# Экскурсии на шоколадную фабрику

Сайт продажи экскурсий на шоколадную фабрику: розничное бронирование, кабинет турфирм с индивидуальными прайс-листами (вход по паролю компании) и админ-панель с управлением расписанием и календарём.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — HMAC key for session cookies

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite (`artifacts/choco-tours`), wouter, React Query

## Where things live

- API contract: `lib/api-spec/openapi.yaml` (source of truth)
- DB schema: `lib/db/src/schema/` (tours, slots, companies + company_prices, bookings, settings)
- Server routes: `artifacts/api-server/src/routes/` (`public.ts`, `company.ts`, `admin.ts`)
- Sessions: `artifacts/api-server/src/lib/session.ts` (HMAC-signed cookies, `company_session` / `admin_session`)
- Frontend: `artifacts/choco-tours/src/pages/` (`public/`, `partner/`, `admin/`)

## Architecture decisions

- Auth is passwords-only by design (user requirement): each tour company has a unique password (stored in `companies.password`, uniqueness enforced); admin password lives in `settings` table under key `admin_password` (default `fabrika2026`).
- Company prices: `company_prices` rows override `tours.base_price`; missing row → company pays base price. `/api/tours` returns `companyPrice` when a company session cookie is present.
- Slot availability is computed on read: capacity minus sum of confirmed booking seats; blocked slots and inactive tours are hidden from public endpoints.
- Bulk schedule generation (`POST /api/admin/slots/bulk`) skips date+time duplicates for the same tour.
- Prices are integer rubles.

## Product

- Public: витрина экскурсий, календарь доступности по дням, бронирование по коду подтверждения (`/booking/:code`).
- Партнёры (`/partner`): вход по паролю компании, свой прайс-лист, бронирование по своим ценам, список своих броней.
- Админка (`/admin`): дашборд, расписание (создание слотов вручную и массово по дням недели/времени, блокировка, вместимость), CRUD экскурсий и компаний, редактор прайс-листов компаний, список броней со сменой статуса.

## Demo data

- Admin password: `fabrika2026`
- Companies: «Горизонт» — `gorizont-2026`, «Сладкие маршруты» — `marshrut-77`

## User preferences

- Интерфейс полностью на русском языке.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, always re-run codegen before touching routes/frontend.
- Deleting a slot with confirmed bookings is rejected (400) — cancel bookings first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
