const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const email = 'nodetest+' + Date.now() + '@example.com';
    const reg = await post('/api/auth/register', { name: 'NodeTest', email, password: 'abc123' });
    console.log('register', reg.status, reg.body);
    const refreshToken = reg.body?.data?.refreshToken;
    const ref = await post('/api/auth/refresh', { refreshToken });
    console.log('refresh', ref.status, ref.body);
  } catch (err) {
    console.error(err);
  }
})();
