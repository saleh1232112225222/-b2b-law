const http = require('https');

const API_SECRET = '69b39eebba4ed912638be9c438b66b91fe3e520b36de06dc3d3d030c3dcb062c';
const MCP_URL = 'https://mcp.higgsfield.ai/mcp';

let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  let lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      sendToHiggsfield(msg);
    } catch (e) {
      // ignore
    }
  }
});

function sendToHiggsfield(msg) {
  const data = JSON.stringify(msg);
  const req = http.request(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${API_SECRET}`,
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk.toString();
    });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const dataLines = body.split('\n');
        for (const dLine of dataLines) {
          if (dLine.startsWith('data: ')) {
            const jsonStr = dLine.substring(6).trim();
            if (jsonStr) {
              process.stdout.write(jsonStr + '\n');
            }
          } else if (dLine.trim().startsWith('{')) {
            process.stdout.write(dLine.trim() + '\n');
          }
        }
      } else {
        if (msg.id !== undefined) {
          const errResp = {
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32603, message: `HTTP ${res.statusCode}: ${body}` }
          };
          process.stdout.write(JSON.stringify(errResp) + '\n');
        }
      }
    });
  });

  req.on('error', (err) => {
    if (msg.id !== undefined) {
      const errResp = {
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32603, message: err.message }
      };
      process.stdout.write(JSON.stringify(errResp) + '\n');
    }
  });

  req.write(data);
  req.end();
}
