const fs = require('fs');
const https = require('https');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const urls = {
  modal: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzI3N2JjYWM1ZmY4MzQwNWZhYTVhMWY1OWQxY2MyOGVkEgsSBxD6gZCbmREYAZIBIwoKcHJvamVjdF9pZBIVQhM2Mzc0MjA5OTAzMzI1MTU3NDM5&filename=&opi=89354086",
  graph: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzIxMTQwNzU4Zjc0YjRiMGM4MGQ1ZmJiNmZiMGZkMjZhEgsSBxD6gZCbmREYAZIBIwoKcHJvamVjdF9pZBIVQhM2Mzc0MjA5OTAzMzI1MTU3NDM5&filename=&opi=89354086",
  library: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzk2ZGMyZWIyMjhjYjQxYjlhYmJjMDJjYzY0ZjYzZGU4EgsSBxD6gZCbmREYAZIBIwoKcHJvamVjdF9pZBIVQhM2Mzc0MjA5OTAzMzI1MTU3NDM5&filename=&opi=89354086"
};

const outputDir = path.join(__dirname, 'scratch_stitch');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function download(name, url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(path.join(outputDir, `${name}.html`), data);
        console.log(`Downloaded ${name}.html`);
        resolve();
      });
    }).on('error', (err) => {
      console.error(`Error downloading ${name}:`, err);
      reject(err);
    });
  });
}

(async () => {
  for (const [name, url] of Object.entries(urls)) {
    await download(name, url);
  }
  console.log('All downloads completed!');
})();
