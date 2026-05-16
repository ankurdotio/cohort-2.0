import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from "http-proxy-middleware";
import http from 'http';

const app = express();
app.use(morgan('combined'));

app.get('/api/status/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
})

app.get('/api/status/readyz', (req, res) => {
    res.status(200).json({ status: 'ready' });
})

const proxies = {}
const agentProxies = {}

function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}`;
    if (!proxies[ sandboxId ]) {
        proxies[ sandboxId ] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
        });
    }
    return proxies[ sandboxId ];
}

function getAgentProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:3000`;
    if (!agentProxies[ sandboxId ]) {
        agentProxies[ sandboxId ] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
        });
    }
    return agentProxies[ sandboxId ];
}

app.use((req, res, next) => {
    const host = req.headers.host;
    const sandboxId = host.split('.')[ 0 ];

    if (host.split('.')[ 1 ] === 'agent') {
        return getAgentProxy(sandboxId)(req, res, next);
    } else if (host.split('.')[ 1 ] === 'preview') {
        return getProxy(sandboxId)(req, res, next);
    }
});

// Create the HTTP server explicitly
const server = http.createServer(app);

// ✅ Handle WebSocket upgrades — this is what was missing
server.on('upgrade', (req, socket, head) => {
    const host = req.headers.host;
    const sandboxId = host.split('.')[ 0 ];
    const type = host.split('.')[ 1 ];

    console.log(`WS upgrade request: ${host}, sandboxId: ${sandboxId}, type: ${type}`);

    if (type === 'agent') {
        const proxy = getAgentProxy(sandboxId);
        proxy.upgrade(req, socket, head);
    } else if (type === 'preview') {
        const proxy = getProxy(sandboxId);
        proxy.upgrade(req, socket, head);
    } else {
        socket.destroy();
    }
});

export default server; // export server, not app