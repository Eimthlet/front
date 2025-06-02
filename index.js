import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fetch from 'node-fetch';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// CORS configuration
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "build")));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Detailed request logging middleware
app.use((req, res, next) => {
  console.log("Incoming Request:", {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  next();
});

// Proxy all API requests to the backend server
app.use('/api', (req, res) => {
  const targetUrl = `${BACKEND_URL}${req.url}`;
  console.log(`Proxying request to: ${targetUrl}`);
  
  // Forward the request to the backend server
  fetch(targetUrl, {
    method: req.method,
    headers: {
      ...req.headers,
      host: new URL(BACKEND_URL).host
    },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
  })
  .then(async (response) => {
    // Forward the response status and headers
    res.status(response.status);
    
    // Forward the response body
    const data = await response.json();
    res.json(data);
  })
  .catch((err) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  });
});

// Serve the React app for any non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start the server
app.listen(port, () => {
  console.log(`Frontend server running at http://localhost:${port}`);
  console.log(`Proxying API requests to ${BACKEND_URL}`);
});
