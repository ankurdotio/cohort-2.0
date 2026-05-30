# FrontendForge — AI-Powered Cloud Sandbox IDE

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28+-326CE5?logo=kubernetes&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-cloud-DC382D?logo=redis&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-CloudAMQP-FF6600?logo=rabbitmq&logoColor=white)
![MistralAI](https://img.shields.io/badge/MistralAI-mistral--large--latest-FF7000)
![LangChain](https://img.shields.io/badge/LangChain-LangGraph-1C3C3C?logo=langchain)
![License](https://img.shields.io/badge/license-ISC-blue)
![Build](https://img.shields.io/badge/build-skaffold-00ADD8)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Microservices Breakdown](#3-microservices-breakdown)
4. [Sandbox Lifecycle](#4-sandbox-lifecycle)
5. [AI Code Editing Layer](#5-ai-code-editing-layer)
6. [Data Models & Schemas](#6-data-models--schemas)
7. [Kubernetes Cluster Design](#7-kubernetes-cluster-design)
8. [Developer Setup & Local Development](#8-developer-setup--local-development)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [API Reference](#10-api-reference)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Security Considerations](#12-security-considerations)
13. [Observability](#13-observability)
14. [Roadmap & Known Limitations](#14-roadmap--known-limitations)
15. [Contributing Guide](#15-contributing-guide)
16. [License](#16-license)

---

## 1. Executive Summary

**FrontendForge** is a browser-based cloud IDE that provisions isolated, per-user React + Vite sandbox environments on demand inside a Kubernetes cluster. Each sandbox runs as a dedicated pod pre-loaded with a starter template; users interact with a VS Code–style UI that includes a live preview pane, a file explorer, an integrated terminal, and an AI chat panel powered by **Mistral Large** via LangChain/LangGraph. The AI agent reads, creates, and updates files directly inside the running pod in real time, triggering Vite's HMR so changes appear instantly in the preview without a full reload.

**Target users:** Frontend developers, students, and educators who want a zero-setup coding environment with AI assistance — no local install required.

**Core value proposition:** Spin up a production-quality React sandbox in one click, describe what you want to build in plain English, and watch the AI write and hot-reload the code while you observe it live in the same browser tab.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph Browser["Browser (React + Vite frontend)"]
        UI["IDE UI\n(SplashScreen / FileExplorer /\nPreviewFrame / Terminal / AiChat)"]
    end

    subgraph Cluster["Kubernetes Cluster (default namespace)"]

        subgraph Ingress["nginx Ingress Controller"]
            ING["codespace-ingress\n/api/auth → auth-service\n/api/sandbox → sandbox-service\n/api/ai → ai-service\n*.preview.localhost → router-service\n*.agent.localhost → router-service"]
        end

        subgraph CoreServices["Core Services"]
            AUTH["auth-service\n(ClusterIP :80)\n──────────────\nauth-deployment\n1 replica\nnode:20-alpine"]
            SANDBOX["sandbox-service\n(ClusterIP :80)\n──────────────\nsandbox-deployment\n1 replica\nnode:20-alpine"]
            AI["ai-service\n(ClusterIP :80)\n──────────────\nai-deployment\n2 replicas\nnode:20-alpine"]
            ROUTER["router-service\n(ClusterIP :80)\n──────────────\nrouter-deployment\n1 replica\nnode:20-alpine"]
            NOTIFY["notification-service\n(ClusterIP :80)\n──────────────\nnotification-deployment\n1 replica\nnode:20-alpine"]
        end

        subgraph SandboxPods["Dynamic Sandbox Pods (one per active session)"]
            POD["sandbox-pod-{id}\n──────────────────────\ninitContainer: template\n  (seeds /seed → emptyDir)\n──────────────────────\ncontainer: template\n  Vite dev server :5173\n  /workspace (emptyDir)\ncontainer: agent\n  File API + PTY :3000\n  /workspace (emptyDir)"]
            SVC["sandbox-service-{id}\n(ClusterIP)\nport 80→5173 (preview)\nport 3000→3000 (agent)"]
        end

        SANDBOX -->|"k8s API: create pod + service"| SandboxPods
        AI -->|"HTTP sandbox-service-{id}:3000\nlist/read/update files"| SVC
        SVC --> POD
    end

    subgraph External["External Managed Services"]
        MONGO[("MongoDB Atlas\n3 databases:\nauth / sandbox / ai")]
        REDIS[("Redis (RedisLabs)\nSandbox TTL keys\n120s expiry")]
        MQ[("RabbitMQ (CloudAMQP)\nauth_notification_queue")]
        MISTRAL["MistralAI API\nmistral-large-latest"]
    end

    UI -- "/api/auth (OAuth)" --> ING
    UI -- "/api/sandbox/start (REST)" --> ING
    UI -- "/api/ai/invoke (SSE)" --> ING
    UI -- "{id}.preview.localhost (HTTP/WS)" --> ING
    UI -- "{id}.agent.localhost (HTTP/WS/Socket.IO)" --> ING

    ING --> AUTH
    ING --> SANDBOX
    ING --> AI
    ING --> ROUTER

    AUTH --> MONGO
    AUTH --> MQ
    NOTIFY --> MQ
    NOTIFY -->|"Gmail OAuth2 email"| SMTP["Gmail SMTP"]
    SANDBOX --> REDIS
    SANDBOX -->|"@kubernetes/client-node"| K8SAPI["K8s API Server"]
    ROUTER --> REDIS
    AI --> MISTRAL

    REDIS -->|"keyspace expiry event"| SANDBOX
```

---

## 3. Microservices Breakdown

### 3.1 Auth Service

| Field | Value |
|---|---|
| **Directory** | `auth/` |
| **Responsibility** | Google OAuth 2.0 login, JWT issuance, user record persistence, login-event notification dispatch |
| **Language / Runtime** | Node.js 20 / ES Modules |
| **Framework** | Express 5 |
| **Port** | 3000 |
| **Dockerfile** | `auth/dockerfile` — `node:20-alpine` |
| **K8s Deployment** | `k8s/auth-deployment.yml` (1 replica) |
| **K8s Service** | `k8s/auth-service.yml` (ClusterIP, port 80 → 3000) |

**Dependencies:**
- MongoDB Atlas (`AUTH_MONGO_URI`) — persists user documents
- RabbitMQ (`RABBITMQ_URL`) — publishes login events to `auth_notification_queue`
- Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) — via `passport-google-oauth20`
- JWT (`JWT_SECRET`) — signs 1-hour access tokens, delivered as `httpOnly` cookies

**API Surface:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/google` | Initiates Google OAuth redirect |
| `GET` | `/api/auth/google/callback` | OAuth callback; upserts user, issues JWT cookie, redirects to `/` |
| `GET` | `/_status/healthz` | Liveness probe → `{ status: 'ok' }` |
| `GET` | `/_status/readyz` | Readiness probe → `{ status: 'ready' }` |

**Key packages:** `passport`, `passport-google-oauth20`, `jsonwebtoken`, `mongoose`, `amqplib`, `cookie-parser`, `morgan`

---

### 3.2 AI Orchestration Service

| Field | Value |
|---|---|
| **Directory** | `ai-orchestration/` |
| **Responsibility** | Hosts the LangGraph ReAct agent ("FrontendForge"); streams AI responses to the frontend via SSE; proxies tool calls (list/read/update files) to the per-sandbox agent sidecar |
| **Language / Runtime** | Node.js 20 / ES Modules |
| **Framework** | Express 5 |
| **Port** | 3000 |
| **Dockerfile** | `ai-orchestration/dockerfile` — `node:20-alpine` |
| **K8s Deployment** | `k8s/ai-deployment.yml` (2 replicas) |
| **K8s Service** | `k8s/ai-service.yml` (ClusterIP, port 80 → 3000) |

**Dependencies:**
- MistralAI API (`MISTRALAI_API_KEY`) — model `mistral-large-latest`
- Sandbox Agent sidecar — HTTP calls to `http://sandbox-service-{projectId}:3000` for file operations

**API Surface:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/invoke` | Streams agent response via SSE; body: `{ message, projectId }` |
| `GET` | `/api/status/healthz` | Liveness probe → `{ status: 'ok' }` |

**Key packages:** `@langchain/mistralai`, `@langchain/langgraph`, `langchain`, `axios`, `zod`, `morgan`

---

### 3.3 Notification Service

| Field | Value |
|---|---|
| **Directory** | `notification/` |
| **Responsibility** | Consumes `auth_notification_queue` from RabbitMQ; sends login-alert emails via Gmail OAuth2 |
| **Language / Runtime** | Node.js 20 / ES Modules |
| **Framework** | Express 5 (thin HTTP shell + health endpoints) |
| **Port** | 4000 |
| **Dockerfile** | `notification/dockerfile` — `node:20-alpine` |
| **K8s Deployment** | `k8s/notification-deployment.yml` (1 replica) |
| **K8s Service** | `k8s/notification-service.yml` (ClusterIP, port 80 → 4000) |

**Dependencies:**
- RabbitMQ (`RABBITMQ_URL`) — consumes `auth_notification_queue` (durable, persistent)
- Gmail SMTP via OAuth2 (`EMAIL_USER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`)

**API Surface:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/_status/healthz` | Liveness probe |
| `GET` | `/_status/readyz` | Readiness probe |

**Key packages:** `amqplib`, `nodemailer`, `morgan`

---

### 3.4 Sandbox Server

| Field | Value |
|---|---|
| **Directory** | `sandbox/server/` |
| **Responsibility** | Provisions new sandbox environments: creates K8s pods and services; registers sandbox TTL keys in Redis; also cleans up expired sandboxes by listening for Redis keyspace expiry events |
| **Language / Runtime** | Node.js 20 / ES Modules |
| **Framework** | Express 5 |
| **Port** | 3000 |
| **Dockerfile** | `sandbox/server/dockerfile` — `node:20-alpine` |
| **K8s Deployment** | `k8s/sandbox-deployment.yml` (1 replica, `serviceAccountName: resource-manager`) |
| **K8s Service** | `k8s/sandbox-service.yml` (ClusterIP, port 80 → 3000) |

**Dependencies:**
- `@kubernetes/client-node` — creates/deletes `Pod` and `Service` resources in the `default` namespace
- Redis (`REDIS_URL`) — stores `sandbox:{id}` keys with 120-second TTL; separate subscriber connection listens for `__keyevent@0__:expired` channel

**API Surface:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sandbox/start` | Creates pod, service, Redis key; returns `{ sandboxId, previewUrl }` |
| `GET` | `/api/sandbox/health` | Liveness/readiness probe |

**Key packages:** `@kubernetes/client-node`, `ioredis`, `uuid`, `express`, `morgan`

---

### 3.5 Sandbox Router

| Field | Value |
|---|---|
| **Directory** | `sandbox/router/` |
| **Responsibility** | Subdomain-based reverse proxy; routes `{id}.preview.localhost` → sandbox Vite dev server; routes `{id}.agent.localhost` → sandbox agent sidecar; handles WebSocket upgrades (Vite HMR + Socket.IO terminal); refreshes sandbox Redis TTL on every request |
| **Language / Runtime** | Node.js 20 / ES Modules |
| **Framework** | Express 5 + raw `http.Server` (for upgrade events) |
| **Port** | 3000 |
| **Dockerfile** | `sandbox/router/dockerfile` — `node:20-alpine` |
| **K8s Deployment** | `k8s/router-deployment.yml` (1 replica) |
| **K8s Service** | `k8s/router-service.yml` (ClusterIP, port 80 → 3000) |

**Dependencies:**
- Redis (`REDIS_URL`) — calls `EXPIRE sandbox:{id} 120` on each proxied request (activity-based TTL refresh)
- `http-proxy-middleware` v4 — HTTP proxy instances per sandboxId
- `httpxy` — shared WebSocket proxy server (replaces the removed `.upgrade()` method from `http-proxy-middleware` v4)

**Routing Logic:**

| Host Pattern | Target |
|---|---|
| `{sandboxId}.preview.localhost` | `http://sandbox-service-{sandboxId}:80` (Vite :5173) |
| `{sandboxId}.agent.localhost` | `http://sandbox-service-{sandboxId}:3000` (Agent) |

WebSocket upgrades are handled on the raw `http.Server` `upgrade` event and dispatched to the same targets via `httpxy`.

**Key packages:** `http-proxy-middleware`, `httpxy`, `ioredis`, `morgan`

---

### 3.6 Sandbox Agent (Sidecar)

| Field | Value |
|---|---|
| **Directory** | `sandbox/agent/` |
| **Responsibility** | Runs as a sidecar container inside every sandbox pod; exposes a REST API for file system operations (list, read, create, update) on `/workspace`; exposes a PTY-backed interactive terminal over Socket.IO |
| **Language / Runtime** | Node.js 20 / ES Modules |
| **Framework** | Express 5 + Socket.IO 4 |
| **Port** | 3000 |
| **Dockerfile** | `sandbox/agent/dockerfile` — `node:20-bullseye` (Debian, required for `node-pty` native compilation via `node-gyp`) |
| **Working Dir** | `/workspace` (shared `emptyDir` volume with the template container) |

**API Surface:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/list-files` | Recursively lists all files under `/workspace`, excluding `node_modules`, `.git`, `dist` |
| `GET` | `/read-files?files=a,b` | Reads file contents; `files` is comma-separated list of paths relative to `/workspace` |
| `PATCH` | `/update-files` | Writes/overwrites file contents; body: `{ updates: [{ file, content }] }`; creates parent directories as needed |
| `POST` | `/create-files` | Creates new files; body: `{ files: [{ file, content }] }` |
| `GET` | `/` | Health/smoke check |

**WebSocket (Socket.IO) Events:**

| Direction | Event | Payload | Description |
|---|---|---|---|
| Server → Client | `terminal-output` | `string` | Raw PTY output data |
| Client → Server | `terminal-input` | `string` | Keystrokes to write to PTY |

**Key packages:** `node-pty`, `socket.io`, `cors`, `express`, `morgan`

---

### 3.7 Sandbox Template

| Field | Value |
|---|---|
| **Directory** | `sandbox/template/` |
| **Responsibility** | Pre-built React + Vite project used as the starting point for every sandbox; runs as both the init container (seeds `/seed`) and the main `template` container (runs `npm run dev` on `/workspace`) |
| **Language / Runtime** | Node.js 20 / ES Modules |
| **Dockerfile** | `sandbox/template/dockerfile` — `node:20-alpine`, WORKDIR `/workspace`, exposes `:5173` |

**Key packages:** `react`, `react-dom`, `@vitejs/plugin-react`, `vite`

---

### 3.8 Frontend (Client IDE)

| Field | Value |
|---|---|
| **Directory** | `frontend/` |
| **Responsibility** | Browser-based IDE UI: sandbox creation, file explorer, live preview iframe, AI chat (SSE), integrated xterm.js terminal |
| **Framework** | React 19 + Vite 8 + Tailwind CSS v4 |
| **Dev Port** | 5173 (proxies `/api/*` to `http://127.0.0.1:80`) |

**Components:**

| Component | File | Description |
|---|---|---|
| `SplashScreen` | `components/SplashScreen.jsx` | Landing page; calls `POST /api/sandbox/start` to boot a sandbox |
| `TopBar` | `components/TopBar.jsx` | Tab switcher (Preview / Files), sandbox ID display, status indicator |
| `FileExplorer` | `components/FileExplorer.jsx` | Tree-view sidebar; fetches file list from `{id}.agent.localhost/list-files`; refreshes on AI edits |
| `FileViewer` | `components/FileViewer.jsx` | Read-only code viewer; fetches content from `{id}.agent.localhost/read-files` |
| `PreviewFrame` | `components/PreviewFrame.jsx` | iframe pointing to `{id}.preview.localhost`; browser-like toolbar with refresh + new-tab |
| `Terminal` | `components/Terminal.jsx` | xterm.js terminal connected via Socket.IO to `{id}.agent.localhost` |
| `AiChat` | `components/AiChat.jsx` | Chat panel; sends messages to `/api/ai/invoke`; consumes SSE stream; displays tool activity log |

**Key packages:** `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`, `socket.io-client`, `tailwindcss`

---

## 4. Sandbox Lifecycle

### 4.1 Provisioning Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (SplashScreen)
    participant ING as Nginx Ingress
    participant SB as Sandbox Server
    participant K8S as Kubernetes API
    participant RD as Redis

    User->>FE: Click "Create Sandbox"
    FE->>ING: POST /api/sandbox/start
    ING->>SB: (routes via ClusterIP)
    SB->>SB: Generate UUID v7 → sandboxId
    par K8s + Redis
        SB->>K8S: createNamespacedPod(sandbox-pod-{id})
        SB->>K8S: createNamespacedService(sandbox-service-{id})
        SB->>RD: SET sandbox:{id} '{"status":"active"}' EX 120
    end
    K8S-->>SB: Pod & Service created
    RD-->>SB: OK
    SB-->>FE: 201 { sandboxId, previewUrl: "http://{id}.preview.localhost" }
    FE->>FE: setSandbox({ sandboxId, previewUrl, agentBase })
    FE->>FE: Render IDE layout
```

### 4.2 Pod Specification

Each sandbox pod contains:

**Init Container — `init-container`**
- Image: `template`
- Command: `sh -c 'cp -r /workspace/. /seed/'`
- Copies the pre-built React/Vite template from the image's `/workspace` into the shared `emptyDir` volume at `/seed`

**Container 1 — `sandbox-container`**
- Image: `template`
- Starts Vite dev server (`npm run dev`) inside `/workspace`
- Port: `5173` (name: `http`)
- Resource limits: CPU 500m / Memory 1Gi; requests: CPU 250m / Memory 500Mi
- Volume mount: `workspace-volume` → `/workspace`

**Container 2 — `agent-container`**
- Image: `agent`
- Starts the file API + PTY server
- Port: `3000` (name: `http`)
- Resource limits: CPU 500m / Memory 1Gi; requests: CPU 250m / Memory 500Mi
- Volume mount: `workspace-volume` → `/workspace`

Both containers share the same `emptyDir` volume (`workspace-volume`), which is seeded by the init container. This means file writes from the agent are immediately visible to Vite's file-watcher, triggering HMR.

### 4.3 Per-Sandbox K8s Service

```yaml
ports:
  - name: http        port: 80   targetPort: 5173  # Vite preview
  - name: agent-http  port: 3000 targetPort: 3000  # Agent API
selector:
  sandboxId: {sandboxId}   # unique per pod — prevents cross-sandbox routing
type: ClusterIP
```

The service selector uses `sandboxId` (not `app: sandbox`) to ensure each service routes exclusively to its paired pod.

### 4.4 TTL & Cleanup Policy

- On creation, `sandbox:{id}` is stored in Redis with a **120-second TTL**.
- Every HTTP/WebSocket request through the **Sandbox Router** calls `EXPIRE sandbox:{id} 120` — effectively extending the TTL on active sessions.
- An **ioredis subscriber** in the Sandbox Server listens on `__keyevent@0__:expired`. When a key expires (inactive for ≥120 seconds with no requests), the handler extracts the `sandboxId` and calls `deleteNamespacedPod` + `deleteNamespacedService` with `gracePeriodSeconds: 0`.
- No persistent storage — the `emptyDir` volume is destroyed with the pod.

### 4.5 Sandbox Routing (Subdomain-Based)

The Nginx Ingress routes two wildcard hosts to `router-service`:

```
*.preview.localhost  →  router-service :80
*.agent.localhost    →  router-service :80
```

The Router reads `req.headers.host`, splits on `.` to extract `sandboxId` and `type` (`preview` vs `agent`), then proxies to the corresponding `sandbox-service-{sandboxId}` ClusterIP on port 80 or 3000 respectively.

---

## 5. AI Code Editing Layer

### 5.1 Agent Architecture

The AI layer uses **LangChain + LangGraph** to build a stateful ReAct agent:

```
LangGraph createAgent({
  model:  ChatMistralAI("mistral-large-latest"),
  tools:  [list_files, read_files, update_files],
  systemPrompt: "FrontendForge — expert AI frontend engineer…",
  recursionLimit: 100
})
```

The agent is a standard LangGraph tool-calling loop: it receives a user message, decides which tools to call (in sequence or in batches), executes them, receives results, and repeats until it has enough information to produce a final response.

### 5.2 Receiving User Intent

```
POST /api/ai/invoke
Body: { message: string, projectId: string }
```

The `projectId` equals the `sandboxId` provisioned during sandbox creation. The frontend sends this alongside every message so the agent knows which sandbox to operate on.

### 5.3 Streaming Response (SSE)

The endpoint sets `Content-Type: text/event-stream` and flushes text over the open connection:

- **Activity lines** — tool progress lines (`"Listing files..."`, `"Reading files..."`, `"Updating files..."`) written via the `writer` callback passed through LangGraph's `context`.
- **Final response** — the last `ai`-role message that contains no `tool_calls` is written as the conclusive text, then `res.end()` closes the stream.

The frontend's `AiChat` component reads the SSE stream with the Fetch API's `ReadableStream`, classifies each line as activity or final response, and renders them as an expandable activity log beneath the AI bubble.

### 5.4 Tool Implementations

All three tools receive `config.context.projectId` and `config.context.writer` via LangGraph's runnable config:

| Tool | HTTP Call | Description |
|---|---|---|
| `list_files` | `GET http://sandbox-service-{id}:3000/list-files` | Returns flat array of all file paths in `/workspace` |
| `read_files` | `GET http://sandbox-service-{id}:3000/read-files?files=…` | Returns map of `{ path: content }` for requested files |
| `update_files` | `PATCH http://sandbox-service-{id}:3000/update-files` | Writes full file contents; creates directories as needed |

The agent communicates with the sandbox agent sidecar over **Kubernetes internal DNS**: `sandbox-service-{sandboxId}` resolves to the per-sandbox ClusterIP service.

### 5.5 Agent Workflow (as defined in system prompt)

1. **Understand** — parse user intent, identify implicit requirements
2. **Plan** — outline component tree, styling approach, sections
3. **Explore** — `list_files` → `read_files` on entry points and files to be modified
4. **Build** — `update_files` in batched calls (configs first, shared components next, pages last)
5. **Polish** — verify responsiveness, imports, accessibility
6. **Report** — summarize changes (written to stream, not to files)

### 5.6 Hot Reload Integration

File writes from `update_files` land on the shared `emptyDir` volume. Vite's file-watcher (configured with `usePolling: true`, `interval: 300ms`, inside the `server` key) detects the change and sends an HMR update over the WebSocket at `ws://{id}.preview.localhost`. The frontend's PreviewFrame iframe receives the update and patches the DOM without a full reload.

### 5.7 AI Model Details

| Parameter | Value |
|---|---|
| Provider | MistralAI |
| Model ID | `mistral-large-latest` |
| Temperature | `0.7` |
| Context window | <!-- TODO: fill in — check Mistral docs for mistral-large context limit --> |
| Max recursion | 100 LangGraph steps |

### 5.8 Context Window Management

The agent uses the full LangGraph message history within a single invocation. There is currently **no cross-session memory** — each `POST /api/ai/invoke` starts a fresh agent run with only the current user message. The agent always calls `list_files` first to orient itself to the current project structure, then `read_files` on relevant files before making edits. This keeps the context focused on the files that matter for the current task.

<!-- TODO: add conversation-history threading if multi-turn context is added -->

### 5.9 Error Handling

- If the agent throws during streaming, the catch block checks `res.headersSent`: if headers were sent, it calls `res.end()` gracefully; otherwise it returns `500 { error: "Failed to invoke agent" }`.
- Individual tool errors (e.g., file not found) return error strings in the tool result object rather than throwing, allowing the agent to reason about the failure and retry or skip.
- File write errors include `mkdir -p` semantics (`recursive: true`) so the agent can create files in new directories without a separate mkdir step.

---

## 6. Data Models & Schemas

### 6.1 User (MongoDB — `auth` database)

**Collection:** `users`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | `ObjectId` | PK, auto | MongoDB document ID |
| `googleId` | `String` | required, unique | Google OAuth `profile.id` |
| `email` | `String` | required, unique | Primary email from Google profile |
| `name` | `String` | required | Display name from Google profile |
| `avatar` | `String` | optional | Profile photo URL from Google |
| `createdAt` | `Date` | auto (timestamps) | Document creation time |
| `updatedAt` | `Date` | auto (timestamps) | Last modification time |

**Indexes:** `googleId` (unique), `email` (unique)

**Relationships:** One user can have many sandboxes (tracked in Redis, not in MongoDB currently).

<details>
<summary>Mongoose Schema</summary>

```javascript
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email:    { type: String, required: true, unique: true },
    name:     { type: String, required: true },
    avatar:   { type: String }
}, { timestamps: true });
```

</details>

### 6.2 Sandbox State (Redis)

Sandbox lifecycle state is tracked in Redis, not MongoDB. There is currently no persistent sandbox record.

**Key format:** `sandbox:{sandboxId}`

**Value:** JSON string `{ "status": "active" }`

**TTL:** 120 seconds (refreshed on every proxied request via the Router)

**Expiry handler:** Sandbox Server subscribes to `__keyevent@0__:expired`; on expiry, deletes the K8s pod and service.

### 6.3 AI Edit History

<!-- TODO: No persistent AI edit history schema is currently implemented. Add a MongoDB collection if edit history / undo is required. Suggested schema:

Collection: `ai_edits`

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | PK |
| `sandboxId` | String | Which sandbox was edited |
| `userId` | ObjectId | ref: users |
| `userMessage` | String | The user's instruction |
| `filesModified` | String[] | Paths that were written |
| `agentSteps` | Number | LangGraph iterations used |
| `createdAt` | Date | Timestamp |
-->

<!-- TODO: fill in — implement if edit history tracking is needed -->

### 6.4 Message Queue Payload

**Queue:** `auth_notification_queue` (RabbitMQ, durable, persistent delivery)

| Field | Type | Description |
|---|---|---|
| `userId` | `ObjectId` (string) | Auth service user `_id` |
| `action` | `String` | Currently always `"google_login"` |
| `timestamp` | `Date` | ISO timestamp of the login event |
| `email` | `String` | User's email address |

---

## 7. Kubernetes Cluster Design

### 7.1 Namespace Strategy

| Namespace | Contents |
|---|---|
| `default` | All application workloads (auth, sandbox, ai, router, notification) and all dynamic sandbox pods/services |
| `ingress-nginx` | nginx Ingress Controller (installed separately) |
| `kube-system` | Cluster system components |

<!-- TODO: Consider splitting core services and user-sandbox pods into separate namespaces for better resource isolation and RBAC scoping -->

### 7.2 Deployed Workloads

| Deployment | Image | Replicas | CPU Req/Limit | Mem Req/Limit | ServiceAccount |
|---|---|---|---|---|---|
| `auth-deployment` | `auth` | 1 | 250m / 500m | 128Mi / 256Mi | default |
| `ai-deployment` | `ai-orchestration` | 2 | 250m / 500m | 128Mi / 256Mi | default |
| `sandbox-deployment` | `sandbox` | 1 | 250m / 500m | 200Mi / 400Mi | `resource-manager` |
| `router-deployment` | `router` | 1 | 250m / 500m | 250Mi / 500Mi | default |
| `notification-deployment` | `notification` | 1 | 150m / 300m | 100Mi / 200Mi | default |

**Dynamic Pods (per sandbox):**

| Container | Image | CPU Req/Limit | Mem Req/Limit |
|---|---|---|---|
| `sandbox-container` | `template` | 250m / 500m | 500Mi / 1Gi |
| `agent-container` | `agent` | 250m / 500m | 500Mi / 1Gi |

### 7.3 Services

| Service | Type | Port | Target |
|---|---|---|---|
| `auth-service` | ClusterIP | 80 → 3000 | `app: auth` |
| `ai-service` | ClusterIP | 80 → 3000 | `app: ai-server` |
| `sandbox-service` | ClusterIP | 80 → 3000 | `app: sandbox` |
| `router-service` | ClusterIP | 80 → 3000 | `app: router` |
| `notification-service` | ClusterIP | 80 → 4000 | `app: notification` |
| `sandbox-service-{id}` | ClusterIP | 80 → 5173, 3000 → 3000 | `sandboxId: {id}` |

### 7.4 Ingress Controller & Routing Rules

**Ingress:** `codespace-ingress` (class: `nginx`)

**Annotations:**
- `proxy-read-timeout: 6000s`, `proxy-send-timeout: 6000s`, `proxy-connect-timeout: 6000s` — necessary for long-lived SSE connections and WebSocket sessions
- `affinity: cookie`, `session-cookie-name: route`, `session-cookie-path: /` — sticky sessions ensure WebSocket upgrades land on the same backend pod as the initial HTTP handshake

**Routing rules:**

| Host | Path | Backend Service | Port |
|---|---|---|---|
| `*` | `/api/sandbox` | `sandbox-service` | 80 |
| `*` | `/api/ai` | `ai-service` | 80 |
| `*` | `/api/auth` | `auth-service` | 80 |
| `*.preview.localhost` | `/` | `router-service` | 80 |
| `*.agent.localhost` | `/` | `router-service` | 80 |

### 7.5 RBAC

**ServiceAccount:** `resource-manager` (used by `sandbox-deployment`)

**Role:** `resource-manager` — grants `get`, `list`, `watch`, `create`, `delete` on `pods` and `services` in the `default` namespace.

**RoleBinding:** `resource-manager-binding` — binds the above role to the `resource-manager` service account.

<details>
<summary>RBAC manifest summary</summary>

```yaml
# k8s/rbac.yml
ServiceAccount: resource-manager
Role: resource-manager
  rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch", "create", "delete"]
RoleBinding: resource-manager-binding
  subjects: [ServiceAccount: resource-manager]
  roleRef: Role: resource-manager
```

</details>

### 7.6 Secrets Strategy

All sensitive values are stored in Kubernetes `Opaque` Secrets, referenced in deployments via `secretKeyRef`.

| Secret Name | Keys | Consumed By |
|---|---|---|
| `database` | `AUTH`, `SANDBOX`, `AI`, `REDIS_URL`, `RABBITMQ_URL`, `RABBITMQ_PORT` | auth, sandbox, router, ai |
| `jwt` | `JWT_SECRET` | auth |
| `google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `EMAIL_USER` | auth, notification |
| `ai-secret` | `MISTRAL_API_KEY` | ai-orchestration |

> **Warning:** `k8s/secrets.yml` currently contains plaintext credentials and is committed to the repository. This must be replaced with an external secrets manager (e.g., Sealed Secrets, HashiCorp Vault, External Secrets Operator) before any production deployment. See [Section 12](#12-security-considerations).

### 7.7 Persistent Storage

Currently there are **no Persistent Volume Claims**. All sandbox storage uses `emptyDir` volumes, which are ephemeral and tied to pod lifetime. This is intentional for the current design — sandboxes are treated as throwaway environments.

<!-- TODO: Add PVC-backed storage if sandbox persistence (save/resume) is required -->

### 7.8 Horizontal Pod Autoscaler

<!-- TODO: No HPA is currently configured. Recommended starting points:

```yaml
# ai-orchestration (CPU-bound, scales under load)
minReplicas: 2, maxReplicas: 10
targetCPUUtilizationPercentage: 70

# router (connection-count bound)
minReplicas: 1, maxReplicas: 5
targetCPUUtilizationPercentage: 60
```
-->

### 7.9 ConfigMaps

<!-- TODO: No ConfigMaps are currently defined. Non-secret configuration (e.g., feature flags, log levels) should be externalized into ConfigMaps rather than baked into images. -->

---

## 8. Developer Setup & Local Development

### 8.1 Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| Node.js | 20.x | All backend services and frontend |
| npm | 10.x | Package management |
| Docker | 24.x | Image builds |
| kubectl | 1.28+ | Cluster management |
| minikube **or** kind | minikube 1.32+ / kind 0.22+ | Local Kubernetes cluster |
| skaffold | v2.x | Dev build + deploy orchestration |
| nginx Ingress Controller | latest | Wildcard subdomain routing |

### 8.2 Step-by-Step Local Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd capstone

# 2. Start a local Kubernetes cluster (minikube example)
minikube start --driver=docker --cpus=4 --memory=8g

# 3. Enable the nginx Ingress addon
minikube addons enable ingress

# 4. Point Docker daemon at minikube's registry
#    (so skaffold-built images are available in-cluster)
eval $(minikube docker-env)

# 5. Edit k8s/secrets.yml with your own credentials
#    (MongoDB Atlas URI, Redis URL, RabbitMQ URL, Google OAuth, MistralAI key)
#    WARNING: never commit real secrets — use a .gitignored local copy
cp k8s/secrets.yml k8s/secrets.local.yml
# edit k8s/secrets.local.yml ...

# 6. Apply secrets
kubectl apply -f k8s/secrets.local.yml

# 7. Apply RBAC
kubectl apply -f k8s/rbac.yml

# 8. Start skaffold in dev mode (builds images, deploys manifests, watches for changes)
skaffold dev

# 9. In a second terminal, start the frontend dev server
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 8.3 Wildcard DNS for Local Routing

The sandbox previews require subdomain routing (`{id}.preview.localhost`). Configure your local DNS resolver or `/etc/hosts` to point `*.localhost` to the minikube IP:

```bash
# Get minikube IP
minikube ip
# e.g. 192.168.49.2

# Option A: /etc/hosts (for specific IDs, impractical in general)
# Option B: Use dnsmasq to resolve *.localhost → minikube IP
# macOS (Homebrew):
brew install dnsmasq
echo "address=/.localhost/$(minikube ip)" >> /opt/homebrew/etc/dnsmasq.conf
sudo brew services start dnsmasq
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/localhost

# Verify
ping testid.preview.localhost
```

### 8.4 Running Individual Services Locally (without K8s)

Each service can be run standalone for faster iteration:

```bash
# Auth service
cd auth
cp .env.example .env   # fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET,
                       # AUTH_MONGO_URI, RABBITMQ_URL
npm install
npm run dev            # nodemon on port 3000

# AI Orchestration
cd ai-orchestration
# .env needs: MISTRALAI_API_KEY
npm install
npm run dev            # port 3000

# Notification
cd notification
# .env needs: RABBITMQ_URL, EMAIL_USER, GOOGLE_CLIENT_ID,
#             GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
npm install
npm run dev            # port 4000

# Sandbox Server
cd sandbox/server
# .env needs: REDIS_URL (and a valid kubeconfig for K8s API access)
npm install
npm run dev            # port 3000

# Sandbox Router
cd sandbox/router
# .env needs: REDIS_URL
npm install
npm run dev            # port 3000

# Sandbox Agent (requires node-pty native build)
cd sandbox/agent
npm install
npm run dev            # port 3000
```

### 8.5 Simulating a Sandbox Spin-Up Locally

With skaffold running and DNS configured:

```bash
# 1. POST to sandbox start (frontend does this automatically on SplashScreen)
curl -X POST http://localhost:80/api/sandbox/start

# Response: { "sandboxId": "019e...", "previewUrl": "http://019e....preview.localhost" }

# 2. Open the previewUrl in a browser to see the Vite template
# 3. Call the agent directly
curl "http://019e....agent.localhost/list-files"

# 4. Update a file
curl -X PATCH http://019e....agent.localhost/update-files \
  -H "Content-Type: application/json" \
  -d '{"updates":[{"file":"/src/App.jsx","content":"export default ()=><h1>Hello</h1>"}]}'
```

---

## 9. Environment Variables Reference

### Auth Service

| Variable | Description | Example | Required |
|---|---|---|---|
| `AUTH_MONGO_URI` | MongoDB Atlas connection string for the `auth` database | `mongodb+srv://user:pass@cluster.mongodb.net/auth` | ✅ |
| `RABBITMQ_URL` | CloudAMQP / RabbitMQ AMQPS URL | `amqps://user:pass@host/vhost` | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | `664682905558-xxx.apps.googleusercontent.com` | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret | `GOCSPX-xxx` | ✅ |
| `JWT_SECRET` | HMAC secret for JWT signing (min 32 chars) | `2b167830d4c790637e5...` | ✅ |

### AI Orchestration Service

| Variable | Description | Example | Required |
|---|---|---|---|
| `MISTRALAI_API_KEY` | MistralAI API key (note: K8s secret uses key `MISTRAL_API_KEY` — see [known issues](#141-known-bugs)) | `h9I8nZxZKBIi...` | ✅ |

### Notification Service

| Variable | Description | Example | Required |
|---|---|---|---|
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqps://user:pass@host/vhost` | ✅ |
| `EMAIL_USER` | Gmail address for sending notifications | `user@gmail.com` | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (for Gmail OAuth2) | `664682905558-xxx.apps.googleusercontent.com` | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxx` | ✅ |
| `GOOGLE_REFRESH_TOKEN` | Gmail OAuth2 refresh token | `1//04Fe...` | ✅ |

### Sandbox Server

| Variable | Description | Example | Required |
|---|---|---|---|
| `REDIS_URL` | Redis connection URL (supports `redis://` and `rediss://`) | `redis://default:pass@host:port` | ✅ |

### Sandbox Router

| Variable | Description | Example | Required |
|---|---|---|---|
| `REDIS_URL` | Redis connection URL (for TTL refresh) | `redis://default:pass@host:port` | ✅ |

### Sandbox Template (Vite config)

| Variable | Description | Example | Required |
|---|---|---|---|
| *(none)* | Template runs with hardcoded Vite config | — | — |

### Sandbox Agent

| Variable | Description | Example | Required |
|---|---|---|---|
| `SHELL` | Shell binary for PTY (defaults to `bash`) | `/bin/bash` | Optional |

---

## 10. API Reference

### 10.1 Auth Service (`/api/auth`)

| Method | Endpoint | Auth Required | Request Body | Response | Description |
|---|---|---|---|---|---|
| `GET` | `/api/auth/google` | No | — | HTTP 302 redirect | Initiates Google OAuth flow |
| `GET` | `/api/auth/google/callback` | No (OAuth token) | — | HTTP 302 redirect + `Set-Cookie: token=<jwt>` | OAuth callback; upserts user; sets JWT cookie |
| `GET` | `/_status/healthz` | No | — | `{ status: 'ok' }` | Liveness probe |
| `GET` | `/_status/readyz` | No | — | `{ status: 'ready' }` | Readiness probe |

### 10.2 Sandbox Server (`/api/sandbox`)

| Method | Endpoint | Auth Required | Request Body | Response | Description |
|---|---|---|---|---|---|
| `POST` | `/api/sandbox/start` | <!-- TODO: JWT auth not yet enforced --> | — | `201 { message, sandboxId, previewUrl }` | Provisions new sandbox pod + service + Redis TTL |
| `GET` | `/api/sandbox/health` | No | — | `200 { message, status }` | Health check |

### 10.3 AI Orchestration Service (`/api/ai`)

| Method | Endpoint | Auth Required | Request Body | Response | Description |
|---|---|---|---|---|---|
| `POST` | `/api/ai/invoke` | <!-- TODO: JWT auth not yet enforced --> | `{ message: string, projectId: string }` | `200 text/event-stream` (SSE) | Streams agent activity lines and final response |
| `GET` | `/api/status/healthz` | No | — | `{ status: 'ok' }` | Liveness probe |

**SSE Stream format:** Each line is either a tool-activity string (e.g., `"Reading files...src/App.jsx\n"`) or the final AI response text. The stream ends with `res.end()`.

### 10.4 Sandbox Agent (per-sandbox, via `{id}.agent.localhost`)

| Method | Endpoint | Auth Required | Request / Query | Response | Description |
|---|---|---|---|---|---|
| `GET` | `/list-files` | No | — | `200 { message, files: string[] }` | List all workspace files (excludes `node_modules`, `.git`, `dist`) |
| `GET` | `/read-files` | No | `?files=path1,path2` | `200 { message, files: [{ path: content }] }` | Read file contents |
| `PATCH` | `/update-files` | No | `{ updates: [{ file, content }] }` | `200 { message, results: [{ path: status }] }` | Write/overwrite file contents; creates parent dirs |
| `POST` | `/create-files` | No | `{ files: [{ file, content }] }` | `200 { message, results: [{ path: status }] }` | Create new files |
| `GET` | `/` | No | — | `200 { message, status }` | Health check |

**Socket.IO (on same host/port):**

| Event | Direction | Payload | Description |
|---|---|---|---|
| `terminal-output` | Server → Client | `string` | Raw PTY data |
| `terminal-input` | Client → Server | `string` | Keystrokes |

---

## 11. CI/CD Pipeline

### 11.1 Current Setup

The project uses **Skaffold** (`skaffold.yml`) as the primary build and deploy orchestrator for local development. Skaffold:
- Builds Docker images for all 7 services using `sha256` tag policy
- Enables file sync for `src/**` in `ai-orchestration`, `auth`, and `notification` (hot-reload without image rebuild)
- Applies all K8s manifests in the `k8s/` directory

### 11.2 Recommended GitHub Actions Pipeline

<!-- TODO: No CI pipeline is currently configured. Below is a recommended setup: -->

```mermaid
flowchart LR
    PR[Pull Request] --> Lint[Lint & Format]
    Lint --> Test[Unit / Integration Tests]
    Test --> Build[Docker Build\nall 7 images]
    Build --> Push[Push to Registry\nGHCR / DockerHub]
    Push --> DeployDev[Deploy to Dev\nkubectl apply]
    DeployDev --> E2E[E2E Smoke Tests]
    E2E --> DeployStaging[Deploy to Staging\n(manual approval)]
    DeployStaging --> DeployProd[Deploy to Prod\n(manual approval)]
```

**Recommended pipeline stages:**

| Stage | Tool | Description |
|---|---|---|
| Lint | ESLint | Run `npm run lint` in each service |
| Test | Jest / Vitest | <!-- TODO: No tests exist yet — add unit tests per service --> |
| Build | Docker Buildx | Multi-platform builds for all 7 images |
| Push | GHCR / DockerHub | Tag with git SHA |
| Deploy Dev | kubectl / Helm | Apply manifests to dev cluster |
| Deploy Staging | kubectl / ArgoCD | Manual promotion gate |
| Deploy Prod | kubectl / ArgoCD | Manual promotion gate with rollback |

### 11.3 Environment Promotion Strategy

| Environment | Trigger | Secrets Source | Cluster |
|---|---|---|---|
| Dev | Push to `main` | GitHub Secrets | Local / dev cluster |
| Staging | Manual approval after dev smoke tests | GitHub Secrets / Vault | Staging cluster |
| Prod | Manual approval after staging sign-off | HashiCorp Vault / AWS Secrets Manager | Production cluster |

<!-- TODO: fill in actual cluster targets and ArgoCD app definitions -->

---

## 12. Security Considerations

### 12.1 Sandbox Isolation Model

- **Pod-level isolation:** Each sandbox runs in its own Kubernetes pod. Containers share the same network namespace within the pod but are isolated from other pods.
- **No cross-sandbox routing:** The per-sandbox K8s service uses `sandboxId` as a unique selector. The AI agent and the Router construct target URLs using the `sandboxId`, not a shared label.
- **No host mount:** The `emptyDir` volume is ephemeral and kernel-managed. It cannot escape the pod boundary.
- **Resource limits enforced:** Each container has CPU and memory limits set, preventing runaway resource consumption.

**Known gap:** There is currently no `securityContext` on sandbox containers (no `readOnlyRootFilesystem`, no `runAsNonRoot`, no `allowPrivilegeEscalation: false`). Users can execute arbitrary code inside the sandbox via the terminal. This is acceptable in a controlled-access environment but must be hardened before public deployment.

### 12.2 Authentication & Authorization

| Concern | Current State | Recommendation |
|---|---|---|
| User auth | Google OAuth 2.0 + JWT cookie (`httpOnly`) | Enforce JWT verification on `/api/sandbox/start` and `/api/ai/invoke` |
| Service-to-service | No mTLS — plain HTTP within cluster | Add mTLS via Istio or cert-manager for production |
| Agent API | No auth — open within cluster | Add a shared secret header validated by the agent |
| K8s API | RBAC `resource-manager` role (pod/service only, default namespace) | Principle of least privilege is followed correctly |

### 12.3 Secret Management

> **Critical issue:** `k8s/secrets.yml` contains live credentials in plaintext and is committed to the repository. This must be remediated immediately:

1. Remove `k8s/secrets.yml` from git history: `git filter-repo` or BFG Repo Cleaner
2. Rotate all exposed credentials (MongoDB, Redis, RabbitMQ, Google OAuth, JWT secret, MistralAI key)
3. Replace with one of:
   - **Bitnami Sealed Secrets** — encrypt secrets client-side, store ciphertext in git
   - **External Secrets Operator** — pull from AWS Secrets Manager / HashiCorp Vault at deploy time
   - **SOPS + age** — encrypt secrets file, decrypt in CI

### 12.4 Network Policies

<!-- TODO: No Kubernetes NetworkPolicy resources are defined. Recommended policies:

- Allow sandbox pods to receive traffic only from router-service and ai-service
- Deny all egress from sandbox pods except to kube-dns (UDP 53)
- Isolate notification service — inbound RabbitMQ only, no direct HTTP ingress
-->

### 12.5 Input Validation

- The AI agent accepts arbitrary user prompts. There is no prompt injection guard or content filtering at the API boundary.
- File paths in the agent REST API are joined with `path.join(WORKING_DIR, file)` which prevents traversal above `/workspace` on POSIX systems.
- No rate limiting is applied to `/api/ai/invoke` or `/api/sandbox/start`.

<!-- TODO: Add rate limiting (express-rate-limit), prompt safety filter, and request size limits -->

---

## 13. Observability

### 13.1 Logging

All services use `morgan` HTTP request logging in `dev` format (method, URL, status, response-time). Application logs are written to stdout/stderr and collected by the Kubernetes node log driver (typically journald or Docker JSON file driver).

**Current gaps:**
- No structured JSON logging (no correlation IDs, no trace IDs)
- No centralized log aggregation

**Recommended stack:** Fluent Bit (DaemonSet) → Elasticsearch/OpenSearch → Kibana, or Loki + Grafana.

### 13.2 Metrics & Monitoring

<!-- TODO: No Prometheus metrics are currently exposed. Recommended additions:

- Add `prom-client` to each service and expose `/metrics`
- Instrument: HTTP request rate, latency histograms, active sandbox count, Redis TTL operations, AI agent invocation count + duration
- Deploy Prometheus + Grafana via kube-prometheus-stack Helm chart
-->

### 13.3 Tracing

<!-- TODO: No distributed tracing is implemented. Recommended: OpenTelemetry SDK in each service, exporting to Jaeger or Tempo. Key traces: sandbox creation end-to-end, AI agent tool-call chain. -->

### 13.4 Alerting

<!-- TODO: No alerting rules are defined. Recommended Prometheus alert rules:

- sandbox pod crash loop (kube_pod_container_status_restarts_total > 5 in 5m)
- Redis connection errors in sandbox-server or router
- AI invocations with error rate > 10% in 5m
- No healthy replicas for auth or ai-orchestration
-->

### 13.5 Health Probes

All services expose liveness and readiness probes:

| Service | Liveness Path | Readiness Path | Initial Delay |
|---|---|---|---|
| `auth` | `/_status/healthz` | `/_status/healthz` | 90s / 30s |
| `ai-orchestration` | `/api/status/healthz` | `/api/status/healthz` | 90s / 30s |
| `sandbox-server` | `/api/sandbox/health` | `/api/sandbox/health` | 90s / 30s |
| `router` | `/api/status/healthz` | `/api/status/readyz` | 90s / 30s |
| `notification` | `/_status/healthz` | `/_status/healthz` | 90s / 30s |

---

## 14. Roadmap & Known Limitations

### 14.1 Known Bugs

These bugs were identified and fixed during development (see `changes.md`):

| # | Bug | Root Cause | Fixed In |
|---|---|---|---|
| 1 | Preview iframe kept reloading | Vite `watch` config at wrong nesting level; missing `hmr.clientPort` | `sandbox/template/vite.config.js` |
| 2 | Router crashed on WebSocket upgrade | `http-proxy-middleware` v4 removed `.upgrade()` method | `sandbox/router/src/app.js` — replaced with `httpxy` |
| 3 | Invalid WebSocket frame header | Double upgrade handler (hpm's internal + manual `server.on('upgrade')`) | Removed `ws: true` from `createProxyMiddleware` options |
| 4 | CORS errors on agent API calls | Agent had no CORS middleware; origin too narrow | `sandbox/agent/src/app.js` — added `cors({ origin: '*' })` |
| 5 | Wrong pod selected by sandbox service | Service selector used `app: sandbox` matching all pods | Changed to `sandboxId: {id}` selector |
| 6 | Sticky session cookie not working | Ingress cookie affinity missing `path: "/"` | `k8s/ingress.yml` |
| 7 | AI chat never delivered final response | `res.json()` called after SSE headers sent; broken error handler | `ai-orchestration/src/routes/agent.routes.js` |

**Open known issues:**

| # | Issue | Impact |
|---|---|---|
| 1 | `k8s/secrets.yml` contains plaintext credentials committed to repo | **Critical** — must remediate before any public exposure |
| 2 | `MISTRAL_API_KEY` (K8s secret key name) vs `MISTRALAI_API_KEY` (env var name in code) mismatch | AI service will not receive the API key in cluster — runtime error on invocation |
| 3 | `/api/sandbox/start` and `/api/ai/invoke` have no JWT authentication enforcement | Any unauthenticated client can spin up sandboxes or invoke the AI |
| 4 | Sandbox pods have no `securityContext` | Containers run as root; no privilege escalation guard |
| 5 | No rate limiting on AI invocation or sandbox creation endpoints | Potential resource exhaustion |
| 6 | All services use `nodemon` in production images (`CMD ["npm", "run", "dev"]`) | nodemon adds overhead and is not appropriate for production |

### 14.2 Technical Debt

- No test suite for any service
- All Dockerfiles use `nodemon` dev mode in `CMD`; production images should use `node server.js`
- No Helm chart — all manifests are raw YAML
- No HPA configured for any service
- No NetworkPolicy resources
- No persistent sandbox storage (user cannot resume a session after TTL expiry)
- Frontend UI labels AI as "Powered by Gemini" but the actual model is `mistral-large-latest`

### 14.3 Planned Features

| Feature | Priority | Description |
|---|---|---|
| Multi-language sandboxes | High | Support Python (FastAPI), Node (Express), Go templates alongside the default React/Vite |
| Sandbox persistence | High | Persist `/workspace` to a PVC or object storage so users can resume sessions |
| JWT auth enforcement | High | Require valid JWT on sandbox and AI endpoints |
| Collaborative editing | Medium | Multiple users sharing a sandbox with CRDT-based file sync (e.g., Yjs) |
| Multi-turn AI context | Medium | Thread conversation history across invocations within a session |
| AI edit history / undo | Medium | Store each agent edit as a diff; allow rollback via UI |
| Package installation | Medium | UI button to run `npm install <pkg>` in sandbox terminal |
| Sandbox templates library | Low | Multiple starter templates (Next.js, vanilla JS, TypeScript, Tailwind, etc.) |
| Team/org workspaces | Low | Shared sandbox libraries, org-level billing |

---

## 15. Contributing Guide

### 15.1 Branch Naming

| Pattern | Use |
|---|---|
| `feat/<short-description>` | New features |
| `fix/<short-description>` | Bug fixes |
| `chore/<short-description>` | Tooling, deps, config (no production code change) |
| `docs/<short-description>` | Documentation only |
| `refactor/<short-description>` | Code restructuring with no behavior change |

Example: `feat/sandbox-persistence`, `fix/ai-env-var-mismatch`

### 15.2 Pull Request Process

1. Branch from `main`. Rebase (do not merge) before opening PR.
2. Title format: `<type>(<scope>): <subject>` — e.g., `fix(ai): correct MISTRAL_API_KEY env var name`
3. PR description must include:
   - **What** changed and **why**
   - Link to related issue (if any)
   - How to test locally
4. All CI checks must pass (lint, build)
5. Require at least one reviewer approval before merge

**PR Review Checklist:**

- [ ] No secrets or credentials in code or manifests
- [ ] No `console.log` left in production paths (use structured logger)
- [ ] New endpoints have at least a basic integration test
- [ ] K8s manifests include resource requests/limits
- [ ] Health probes updated if new service or port added
- [ ] `PROJECT.md` / `changes.md` updated if architecture changes

### 15.3 Code Style & Lint

- **All services:** ESLint with project-default config (`eslint.config.js`)
- **Frontend:** React-specific rules (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)
- **ES Modules:** All Node.js services use `"type": "module"` — use `import`/`export`, not `require`
- **No trailing semicolons** in JSX files (follow existing style per file)
- Run lint before committing: `npm run lint` in each changed service directory

<!-- TODO: Add a root-level `package.json` with a workspace lint script to run all services at once -->

### 15.4 Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer: Co-Authored-By, Fixes #issue]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`

---

## 16. License

ISC License

<!-- TODO: Add full license text or LICENSE file -->

```
Copyright (c) 2025 <!-- TODO: author name -->

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```
