# Local Development Ports — Outlook Clone

This clone runs on the following **HOST** ports when started via
`docker compose -f docker-compose.dev.yml up` and Vite via
`cd app/frontend && pnpm run dev`.

| Service           | Host port | Container port | Notes                                |
| ----------------- | --------: | -------------: | ------------------------------------ |
| Backend (FastAPI) |  **8045** |           8030 | uvicorn inside `clone-app` container |
| Frontend (Vite)   |  **3045** |            n/a | host-only dev server                 |
| Postgres          |  **5445** |           5432 | mapped via compose                   |

The pair `8045` / `5445` sits in the unallocated band of the master multi-clone
port plan (zendesk 8030 / 5430 through google-calendar 8042 / 5442 in
`cua/dev/ports.json`). The frontend `3045` matches the backend mod-1000 so the
two ports are easy to remember as a set.

Container ports are unchanged from upstream defaults — only host bindings differ.
