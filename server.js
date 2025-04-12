#!/usr/bin/env node
const { spawn } = require('child_process');
const port = process.env.PORT || 3000;

const nextStart = spawn('next', ['start', '-p', port], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

nextStart.on('close', (code) => {
  process.exit(code);
});
