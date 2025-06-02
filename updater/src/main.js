const http = require('http');
const { URL } = require('url');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 8109;

if (!WEBHOOK_SECRET) {
  console.error('Error: WEBHOOK_SECRET environment variable is not set.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  
  if (
    req.method === 'POST' &&
    reqUrl.pathname === `/update/${WEBHOOK_SECRET}`
  ) {
    // Make the outgoing request to localhost:8109/v1/update with Authorization header
    const options = {
      hostname: 'localhost',
      port: 8109,
      path: '/v1/update',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mytoken'
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => {
        data += chunk;
      });
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        res.end(data);
      });
    });

    proxyReq.on('error', (e) => {
      console.error('Problem with request:', e.message);
      res.statusCode = 500;
      res.end('Error forwarding request');
    });

    // Forward the original request body, if any
    req.pipe(proxyReq);

  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}/update/${WEBHOOK_SECRET}`);
});
