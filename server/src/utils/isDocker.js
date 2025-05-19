import fs from 'fs';

/**
 * Check if the application is running inside a Docker container.
 * This function checks for the presence of /.dockerenv or
 * checks the cgroup file for Docker-related entries.
 *
 * @returns {boolean} True if running in Docker, false otherwise.
 */
function isDocker() {
  try {
    return fs.existsSync('/.dockerenv') ||
           fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker');
  } catch {
    return false;
  }
}

export default isDocker;