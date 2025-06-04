import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create temporary storage directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Serve static files from temp directory
app.use('/temp', express.static(tempDir));

// Enhanced multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e8 // 100MB buffer for large files
});

const waitingUsers = [];
const socketRoomMap = new Map();
const activeImages = new Map();

// Helper function to remove user from current room and notify partner
const disconnectFromCurrentRoom = (socket) => {
  const currentRoomId = socketRoomMap.get(socket.id);
  
  if (currentRoomId) {
    console.log(`Disconnecting ${socket.id} from room ${currentRoomId}`);
    
    // Notify partner about disconnection
    socket.to(currentRoomId).emit('partner-disconnected');
    
    // Leave the room
    socket.leave(currentRoomId);
    
    // Clean up socket room mapping
    socketRoomMap.delete(socket.id);
    
    // Clean up partner's socket mapping if they're still connected
    const allSockets = [...socketRoomMap.entries()];
    allSockets.forEach(([socketId, mappedRoomId]) => {
      if (mappedRoomId === currentRoomId && socketId !== socket.id) {
        socketRoomMap.delete(socketId);
      }
    });
    
    return true;
  }
  
  return false;
};

// Helper function to remove user from waiting lists
const removeFromWaitingLists = (socketId) => {
  const index = waitingUsers.findIndex(user => user.socket.id === socketId);
  if (index !== -1) {
    waitingUsers.splice(index, 1);
    console.log(`Removed ${socketId} from waiting list`);
    return true;
  }
  return false;
};

app.get('/temp/:filename', (req, res) => {
  const filePath = path.join(tempDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image expired or not found' });
  }

  // Determine content type based on file extension
  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'image/jpeg';
  switch (ext) {
    case '.png':
      contentType = 'image/png';
      break;
    case '.gif':
      contentType = 'image/gif';
      break;
    case '.webp':
      contentType = 'image/webp';
      break;
    case '.jpg':
    case '.jpeg':
    default:
      contentType = 'image/jpeg';
      break;
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving image:', err);
      res.status(500).json({ error: 'Error serving image' });
    }
  });
});

// Clean up temp directory on server start
const cleanupTempDirectory = () => {
  fs.readdir(tempDir, (err, files) => {
    if (err) {
      console.error('Error reading temp directory:', err);
      return;
    }
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting file:', unlinkErr);
        } else {
          console.log('Cleaned up file:', file);
        }
      });
    });
  });
};

// Clean up on server start
cleanupTempDirectory();

// Helper function to validate base64 image data
const validateBase64Image = (base64String) => {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    // Check if it's a valid image by checking the first few bytes
    const header = buffer.toString('hex', 0, 4);
    
    // Check for common image file signatures
    const imageSignatures = {
      'ffd8': 'jpg',
      '8950': 'png',
      '4749': 'gif',
      '5249': 'webp'
    };
    
    const signature = header.toLowerCase();
    for (const [sig, type] of Object.entries(imageSignatures)) {
      if (signature.startsWith(sig)) {
        return { valid: true, type };
      }
    }
    
    return { valid: false, type: null };
  } catch (error) {
    return { valid: false, type: null };
  }
};

// Helper function to generate safe filename
const generateSafeFilename = (originalFilename) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  const extension = path.extname(originalFilename).toLowerCase() || '.jpg';
  return `img-${timestamp}-${randomString}${extension}`;
};

// Helper function to schedule file deletion
const scheduleFileDeletion = (filename, delayMs = 30000) => {
  const filePath = path.join(tempDir, filename);
  
  const deletionTimer = setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting expired image:', err);
      } else {
        console.log('Deleted expired image:', filename);
      }
    });
    activeImages.delete(filename);
  }, delayMs);

  // Store reference to the timer
  activeImages.set(filename, deletionTimer);
  
  return deletionTimer;
};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join', ({ username }) => {
    console.log(`User ${username} wants to join`);
    
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.pop();

      const roomId = `room-${socket.id}-${partner.socket.id}`;

      socket.join(roomId);
      partner.socket.join(roomId);
      
      socketRoomMap.set(socket.id, roomId);
      socketRoomMap.set(partner.socket.id, roomId);
      
      socket.emit('connected', { roomId, partner: partner.username });
      partner.socket.emit('connected', { roomId, partner: username });

      console.log(`Matched ${username} with ${partner.username} in room ${roomId}`);
    } else {
      waitingUsers.push({ socket, username });
      socket.emit('waiting', 'Looking for a partner...');
      console.log(`${username} is waiting for a partner`);
    }
  });
  
  // Handle image uploads
  socket.on('upload-image', async (data, callback) => {
    console.log('Received image upload request');
    
    try {
      const { roomId, imageData, sender, filename } = data;
      
      // Validate input
      if (!imageData || !filename || !roomId || !sender) {
        throw new Error('Missing required fields');
      }

      // Validate base64 image data
      const validation = validateBase64Image(imageData);
      if (!validation.valid) {
        throw new Error('Invalid image data');
      }

      // Create unique filename
      const safeFilename = generateSafeFilename(filename);
      const tempPath = path.join(tempDir, safeFilename);

      // Convert base64 to buffer and save
      const buffer = Buffer.from(imageData, 'base64');
      
      // Validate file size
      if (buffer.length > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }

      await fs.promises.writeFile(tempPath, buffer);
      console.log('Image saved:', safeFilename);

      // Schedule file deletion after 30 seconds
      scheduleFileDeletion(safeFilename, 30000);

      // Broadcast to room
      const imageUrl = `/temp/${safeFilename}`;
      const expiresAt = Date.now() + 30000;
      
      io.to(roomId).emit('image-message', {
        imageUrl,
        sender,
        expiresAt
      });

      console.log(`Image broadcast to room ${roomId}: ${imageUrl}`);

      // Send success response
      if (callback) {
        callback({ 
          success: true, 
          imageUrl,
          expiresAt
        });
      }
      
    } catch (error) {
      console.error('Image upload error:', error);
      
      if (callback) {
        callback({ 
          success: false, 
          error: error.message 
        });
      }
    }
  });

  // Handle finding new chat partner
  socket.on('find-new-chat', ({ username }) => {
    console.log(`${username} wants to find a new chat partner`);
    
    // Remove from current room and notify partner
    const wasInRoom = disconnectFromCurrentRoom(socket);
    
    // Remove from any waiting lists
    removeFromWaitingLists(socket.id);
    
    // Notify client that they've been disconnected from current room
    if (wasInRoom) {
      socket.emit('disconnected-from-room');
    }
    
    // Start searching for new partner
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.pop();
      
      const roomId = `room-${socket.id}-${partner.socket.id}`;
      
      socket.join(roomId);
      partner.socket.join(roomId);
      
      socketRoomMap.set(socket.id, roomId);
      socketRoomMap.set(partner.socket.id, roomId);
      
      socket.emit('connected', { roomId, partner: partner.username });
      partner.socket.emit('connected', { roomId, partner: username });
      
      console.log(`New match: ${username} with ${partner.username} in room ${roomId}`);
    } else {
      waitingUsers.push({ socket, username });
      socket.emit('searching-new-chat', 'Looking for a new partner to chat with...');
      console.log(`${username} is waiting for a new partner`);
    }
  });

  // Handle text messages
  socket.on('message', ({ roomId, sender, message }) => {
    console.log(`Message in room ${roomId} from ${sender}: ${message}`);
    socket.to(roomId).emit('message', { message, sender });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    
    // Remove from waiting users
    removeFromWaitingLists(socket.id);
    
    // Handle room cleanup and notify partner
    disconnectFromCurrentRoom(socket);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Cancel all pending file deletions
  activeImages.forEach((timer, filename) => {
    clearTimeout(timer);
  });
  
  // Clean up temp directory
  cleanupTempDirectory();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  
  // Cancel all pending file deletions
  activeImages.forEach((timer, filename) => {
    clearTimeout(timer);
  });
  
  // Clean up temp directory
  cleanupTempDirectory();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Temp directory: ${tempDir}`);
});