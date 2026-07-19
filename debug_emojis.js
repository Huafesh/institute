
const https = require('https');

function get(url) {
  https.get(url, (resp) => {
    if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
      console.log("Redirecting to " + resp.headers.location);
      get(resp.headers.location);
      return;
    }

    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
      try {
        const emojis = JSON.parse(data);
        console.log("First item keys:", Object.keys(emojis[0]));
        console.log("First item category/group:", emojis[0].category, "|", emojis[0].group);

        // Collect unique categories/groups
        const categories = [...new Set(emojis.map(e => e.category))].slice(0, 10);
        const groups = [...new Set(emojis.map(e => e.group || "no-group"))].slice(0, 10);

        console.log("Sample Categories:", categories);
        console.log("Sample Groups:", groups);
      } catch (e) {
        console.error("Parse error or text: " + data.substring(0, 100));
      }
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

get('https://unpkg.com/emoji.json/emoji.json');
