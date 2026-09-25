const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/saleh1232112225222/-b2b-law/actions/runs?per_page=5',
  headers: {
    'User-Agent': 'NodeJS',
    ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {})
  }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.workflow_runs && json.workflow_runs.length > 0) {
        json.workflow_runs.forEach(r => {
          console.log(`[Run #${r.run_number}] ID: ${r.id} | Status: ${r.status} | Conclusion: ${r.conclusion || 'running'} | Event: ${r.event} | Branch: ${r.head_branch} | URL: ${r.html_url}`);
          console.log(`  Commit: ${r.head_commit?.message?.split('\n')[0]}`);
        });
      } else {
        console.log('No runs found or response:', data);
      }
    } catch (e) {
      console.error('JSON parse error:', e, data);
    }
  });
}).on('error', err => console.error(err));
