# Capstone — Session Change Log

## 1. Preview iframe kept reloading

**Root cause:** Vite's file-watcher config was placed at the wrong level in `vite.config.js`,
so it was silently ignored. Vite fell back to inotify inside the container, which fires
constantly under Kubernetes volume mounts. HMR was also missing `clientPort`, so the
browser's HMR socket connected on the wrong port and triggered full-page reloads.

### `sandbox/template/vite.config.js`

```diff
- watch: {          // ← was at the root of defineConfig (wrong)
-   usePolling: true,
-   interval: 300,
-   ignored: ['node_modules']
- }

  server: {
+   hmr: { clientPort: 80, protocol: 'ws' },  // tell the browser to connect HMR on port 80 (ingress)
+   watch: {                                   // must live inside `server`, not root
+     usePolling: true,
+     interval: 300,
+     ignored: ['node_modules']
+   }
  }
```

---

## 2. Router crashed on every WebSocket upgrade (`proxy.upgrade is not a function`)

**Root cause:** `http-proxy-middleware` v4 removed the `proxy.upgrade()` method that existed
in v2. The upgrade handler called it, crashed the Node process, and nginx returned 502s with
no CORS headers — which looked like a CORS error in the browser.

**Fix:** Replace the per-proxy `.upgrade()` calls with a single shared `httpxy` proxy server
(`createProxyServer`) that has a proper `.ws()` API.

### `sandbox/router/package.json`

```diff
+ "httpxy": "^0.5.1"   // httpxy is http-proxy-middleware v4's own internal library
```

### `sandbox/router/src/app.js`

```diff
+ import { createProxyServer } from 'httpxy';

+ const wsProxy = createProxyServer({ changeOrigin: true });
+ wsProxy.on('error', (err, req, socket) => { socket?.destroy(); });

  server.on('upgrade', (req, socket, head) => {
+   socket.on('error', () => socket.destroy());   // guard against EPIPE during live pipe
    if (type === 'agent') {
-     getAgentProxy(sandboxId).upgrade(req, socket, head);  // throws — method gone in v4
+     wsProxy.ws(req, socket, { target: `http://sandbox-service-${sandboxId}:3000` }, head)
+       .catch(() => socket.destroy());
    } else if (type === 'preview') {
-     getProxy(sandboxId).upgrade(req, socket, head);
+     wsProxy.ws(req, socket, { target: `http://sandbox-service-${sandboxId}` }, head)
+       .catch(() => socket.destroy());
    }
  });
```

---

## 3. `Invalid frame header` — WebSocket frames were corrupted

**Root cause:** `ws: true` on the `createProxyMiddleware` instances made
`http-proxy-middleware` v4 register its *own* internal upgrade listener. Combined with the
manual `server.on('upgrade', ...)` handler, two listeners raced to respond to the same
upgrade request — the browser received two conflicting HTTP 101 responses and the frame
header was garbage.

### `sandbox/router/src/app.js`

```diff
  proxies[sandboxId] = createProxyMiddleware({
    target,
    changeOrigin: true,
-   ws: true,   // caused double upgrade handler → corrupted WS frames
  });
```

---

## 4. CORS errors on agent API calls

**Root cause:** The sandbox agent had no CORS middleware at all, and its previous config used
`origin: "http://localhost:5173"` — too narrow for any cluster-routed request. When the
router crashed (issue 2), nginx 502s had no CORS headers either, making the real crash look
like a CORS problem.

### `sandbox/agent/package.json`

```diff
+ "cors": "^2.8.6"
```

### `sandbox/agent/src/app.js`

```diff
+ import cors from 'cors';
+ app.use(cors({ methods: ["GET","POST","PATCH","DELETE"], origin: "*" }));
```

---

## 5. K8s pod/service selector too broad (`app: 'sandbox'`)

**Root cause:** Every sandbox pod carried `app: 'sandbox'`, and every sandbox service
selected on `app: 'sandbox'`. Any service matched any pod, so traffic was randomly routed
to the wrong container.

### `sandbox/server/src/kubernetes/pod.js` & `service.js`

```diff
  labels:
-   app: 'sandbox'      // matched ALL sandbox pods
    sandboxId: sandboxId

  selector:
-   app: 'sandbox'
    sandboxId: sandboxId   // only now is the selector unique per sandbox
```

---

## 6. Ingress cookie affinity missing `path`

**Root cause:** The nginx sticky-session cookie had no `path` set, so the browser sometimes
sent it on the wrong path, breaking affinity for WebSocket connections that needed to land on
the same backend pod.

### `k8s/ingress.yml`

```diff
+ nginx.ingress.kubernetes.io/session-cookie-path: "/"
```

---

## 7. AI chat SSE — final response never delivered

Three separate bugs in the AI orchestration service meant that tool calls crashed silently
and the response stream never ended.

### Bug — `res.json()` called after SSE headers + broken error handler (`agent.routes.js`)

`res.json({ response })` is illegal once `writeHead` has been called — it throws, the
catch block then tries `res.status(500).json(...)` on already-sent headers, and the
connection never closes cleanly.

```diff
- res.json({ response });                              // throws, response was an iterator anyway
+ // walk lastState.messages in reverse to find the final AI message (no tool_calls)
+ // write it to the stream, then:
+ res.end();

  } catch (error) {
-   res.status(500).json({ error: "Failed to invoke agent" });   // always throws if headers sent
+   if (res.headersSent) { res.end(); }
+   else { res.status(500).json({ error: "Failed to invoke agent" }); }
  }
```

Also fixed: `writer` is now created and wired into `context` so tool activity lines stream
to the client in real time as the agent works.

```diff
+ const writer = (text) => res.write(text);
  await agent.stream(input, {
-   context: { projectId }
+   context: { projectId, writer }
  })
```
