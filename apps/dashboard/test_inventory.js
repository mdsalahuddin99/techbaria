const http = require('http');

http.get('http://localhost:3001/api/inventory/metrics', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    try {
      const parsed = JSON.parse(data);
      console.log('Low Stock:', parsed.lowStock);
      console.log('Dead Stock:', parsed.deadStock);
    } catch(e) {
      console.log('Error parsing JSON or other error:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
