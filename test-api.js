const https = require('https');

const urls = [
  'https://gameinfo.albiononline.com/api/gameinfo/items?lang=en',
  'https://gameinfo.albiononline.com/api/gameinfo/items',
];

let completed = 0;
urls.forEach((url, idx) => {
  const req = https.get(url, { timeout: 8000 }, (res) => {
    console.log(`\n=== URL ${idx} ===`);
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (Array.isArray(json)) {
          console.log(`Array length: ${json.length}`);
          console.log(`Sample:`, JSON.stringify(json.slice(0, 1), null, 2).substring(0, 500));
        } else if (typeof json === 'object') {
          const keys = Object.keys(json);
          console.log(`Object keys: ${keys.length}`);
          console.log(`Sample:`, JSON.stringify(Object.fromEntries(Object.entries(json).slice(0, 1)), null, 2).substring(0, 500));
        }
      } catch (e) {
        console.log(`Response length: ${data.length} chars`);
        console.log(`First 300 chars:`, data.substring(0, 300));
      }
      completed++;
      if (completed === urls.length) process.exit(0);
    });
  }).on('error', (e) => {
    console.log(`\n=== URL ${idx}: FAILED ===`);
    console.log(`Error: ${e.message}`);
    completed++;
    if (completed === urls.length) process.exit(0);
  });
  
  req.setTimeout(8000);
});

setTimeout(() => {
  console.log('\n\nTimeout - exiting');
  process.exit(1);
}, 30000);
