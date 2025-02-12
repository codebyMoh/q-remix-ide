const chokidar = require('chokidar');
const { exec } = require('child_process');

// Watch the contracts directory
const watcher = chokidar.watch('./contracts', {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('all', (event, path) => {
  console.log(`File ${path} has been ${event}`);
  exec('node compile.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Stdout: ${stdout}`);
  });
});

console.log('Watching for changes in the contracts directory...');