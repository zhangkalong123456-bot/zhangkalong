import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRouter from './routes/ai.js';
import workshopRouter from './routes/workshop.js';
import debateRouter from './routes/debate.js';
import authRouter from './routes/auth.js';
import classesRouter from './routes/classes.js';
import recordsRouter from './routes/records.js';
import draftsRouter from './routes/drafts.js';
import tasksRouter from './routes/tasks.js';
import roomsRouter from './routes/rooms.js';
import { setupSocket } from './socket/index.js';
import './db.js'; // Initialize database on startup

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(express.json({ limit: '2mb' }));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/classes', classesRouter);
app.use('/api/records', recordsRouter);
app.use('/api/drafts', draftsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api', aiRouter);
app.use('/api/workshop', workshopRouter);
app.use('/api/debate', debateRouter);

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Socket.io setup
setupSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎙 AI-Debate Master 后端已启动: http://localhost:${PORT}`);
});
