const http = require('http');

http.get('http://localhost:3001/api/auth/session', (res) => {
  let data = '';
  console.log('Status:', res.statusCode);
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('Body:', data.substring(0, 500)); });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
