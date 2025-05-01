import express from 'express';
import { config } from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const webhookSecret = process.env.WEBHOOK_SECRET || 'secret';
const dockerSocketPath = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
const dockerComposePath = process.env.DOCKER_COMPOSE_PATH || '/app/compose/docker-compose.yml';

// Middleware to parse JSON requests
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Webhook endpoint for client updates
app.post(`/update/${webhookSecret}/client`, async (req, res) => {
  console.log('Received webhook for client update');
  
  try {
    await updateContainer('webontour-client');
    res.status(200).send('Client container update initiated');
  } catch (error) {
    console.error('Error updating client container:', error);
    res.status(500).send('Failed to update client container');
  }
});

// Webhook endpoint for server updates
app.post(`/update/${webhookSecret}/server`, async (req, res) => {
  console.log('Received webhook for server update');
  
  try {
    await updateContainer('webontour-server');
    res.status(200).send('Server container update initiated');
  } catch (error) {
    console.error('Error updating server container:', error);
    res.status(500).send('Failed to update server container');
  }
});

// Function to update a Docker container
async function updateContainer(containerName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Get newest image from Docker Hub
    const pull = spawn('docker', ['pull', `benjaminderprogrammierer/${containerName}`]);

    pull.stdout.on('data', (data) => {
      console.log(`Pulling image for ${containerName}: ${data}`);
    });
    pull.stderr.on('data', (data) => {
      console.error(`Error pulling image for ${containerName}: ${data}`);
      reject(new Error(`Failed to pull image for ${containerName}`));
    });
    pull.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Docker pull process exited with code ${code}`));
        return;
      }
      console.log(`Successfully pulled image for ${containerName}`);

      // Update the container with docker-compose
      const compose = spawn('docker-compose', ['-f', dockerComposePath, 'up', '-d']);
      compose.stdout.on('data', (data) => {
        console.log(`Updating container ${containerName}: ${data}`);
      });
      compose.stderr.on('data', (data) => {
        console.error(`Error updating container ${containerName}: ${data}`);
        reject(new Error(`Failed to update container ${containerName}`));
      });
      compose.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Docker-compose process exited with code ${code}`));
          return;
        }
        console.log(`Successfully updated container ${containerName}`);
        resolve();
      });
    });
  });
}

// Start the server
app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
  console.log(`Webhook endpoints:`);
  console.log(`- Client: /update/${webhookSecret}/client`);
  console.log(`- Server: /update/${webhookSecret}/server`);
  console.log(`Using Docker socket: ${dockerSocketPath}`);
});
