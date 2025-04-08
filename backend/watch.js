const chokidar = require('chokidar');
const { exec } = require('child_process');

// Watch the contracts directory
const watcher = chokidar.watch('./contracts', {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('all', (event, path) => {
  exec('npm run compile', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
  });
});
