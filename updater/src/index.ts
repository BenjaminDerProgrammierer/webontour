// WIP - work in progress
import express from 'express';
import { config } from 'dotenv';
import { spawn } from 'child_process';

// Load environment variables
config();

const app = express();
const port = process.env.PORT ?? 3000;
const webhookSecret = process.env.WEBHOOK_SECRET ?? 'secret';
const dockerSocketPath = process.env.DOCKER_SOCKET_PATH ?? '/var/run/docker.sock';
const dockerComposePath = process.env.DOCKER_COMPOSE_PATH ?? '/app/compose/docker-compose.yml';

// Middleware to parse JSON requests
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Webhook endpoint for updates
app.post(`/update/${webhookSecret}/:1`, async (req, res) => {
  const containerId = req.params[1];
  console.log(`Received webhook for container update: ${containerId}`);

  try {
    await updateContainer(containerId);
    res.status(200).send('Container update initiated');
  } catch (error) {
    console.error('Error updating container:', error);
    res.status(500).send('Failed to update container');
  }
});

// Function to update a Docker container
async function updateContainer(containerName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Step 1: Pull the latest image
    const pull = spawn('docker', ['pull', containerName], { shell: true });
    pull.stdout.on('data', (data: Buffer) => {
      console.log(`Pulling image: ${data.toString() }`);
    });
    pull.stderr.on('data', (data: Buffer) => {
      console.error(`Error pulling image: ${data.toString()}`);
    });

    pull.on('close', (code: number) => {
      if (code !== 0) {
        return reject(new Error(`Pull process exited with code ${code}`));
      }
      console.log('Image pulled successfully');
      resolve();
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
