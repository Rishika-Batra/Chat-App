import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from './db/connect.js';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || undefined);

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('unauthorized'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.id,
        username: decoded.username
      };
      next();
    } catch (err) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`Client connected: ${socket.id} (User: ${socket.user.username})`);

    try {
      // Use Redis to set key with 300s expiration
      await redis.setex(`user:online:${userId}`, 300, '1');

      // Update PostgreSQL
      await pool.query(
        `UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1`,
        [userId]
      );

      // Emit to all clients
      io.emit('user_online', { userId });
    } catch (error) {
      console.error('Error handling online presence:', error);
    }

    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const checkResult = await pool.query(
          `SELECT id FROM conversations 
           WHERE id = $1 AND (participant_a_id = $2 OR participant_b_id = $2)`,
          [conversationId, userId]
        );

        if (checkResult.rows.length > 0) {
          socket.join(`conv:${conversationId}`);
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    socket.on('send_message', async ({ conversationId, content }) => {
      try {
        if (!conversationId || !content) return;

        const insertResult = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content) 
           VALUES ($1, $2, $3) 
           RETURNING id, created_at`,
          [conversationId, userId, content]
        );

        const newMessage = insertResult.rows[0];

        await pool.query(
          `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
          [conversationId]
        );

        io.to(`conv:${conversationId}`).emit('new_message', {
          id: newMessage.id,
          conversationId,
          senderId: userId,
          content,
          createdAt: newMessage.created_at,
          isRead: false
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('user_typing', {
        userId,
        conversationId
      });
    });

    socket.on('mark_read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        await pool.query(
          `UPDATE messages 
           SET is_read = true, read_at = NOW() 
           WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
          [conversationId, userId]
        );

        io.to(`conv:${conversationId}`).emit('messages_read', { conversationId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      try {
        await pool.query(
          `UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1`,
          [userId]
        );
        await redis.del(`user:online:${userId}`);
        io.emit('user_offline', { userId });
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  return io;
};
