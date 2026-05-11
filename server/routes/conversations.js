import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import pool from '../db/connect.js';

const router = Router();

router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (userId === recipientId) {
      return res.status(400).json({ error: 'Cannot create a conversation with yourself' });
    }

    const checkResult = await pool.query(
      `SELECT id, participant_a_id, participant_b_id, created_at 
       FROM conversations 
       WHERE (participant_a_id = $1 AND participant_b_id = $2) 
          OR (participant_a_id = $2 AND participant_b_id = $1)`,
      [userId, recipientId]
    );

    if (checkResult.rows.length > 0) {
      return res.json(checkResult.rows[0]);
    }

    const [participantA, participantB] = [userId, recipientId].sort();

    const insertResult = await pool.query(
      `INSERT INTO conversations (participant_a_id, participant_b_id) 
       VALUES ($1, $2) 
       RETURNING id, participant_a_id, participant_b_id, created_at`,
      [participantA, participantB]
    );

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      const checkResult = await pool.query(
        `SELECT id, participant_a_id, participant_b_id, created_at 
         FROM conversations 
         WHERE (participant_a_id = $1 AND participant_b_id = $2) 
            OR (participant_a_id = $2 AND participant_b_id = $1)`,
        [req.user.id, req.body.recipientId]
      );
      if (checkResult.rows.length > 0) {
        return res.json(checkResult.rows[0]);
      }
    }
    console.error('Create conversation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        c.id, 
        c.created_at, 
        c.last_message_at,
        u.id AS contact_id,
        u.username AS contact_username,
        u.avatar_url AS contact_avatar_url,
        u.is_online AS contact_is_online,
        u.last_seen AS contact_last_seen
      FROM conversations c
      JOIN users u ON u.id != $1 AND (u.id = c.participant_a_id OR u.id = c.participant_b_id)
      WHERE c.participant_a_id = $1 OR c.participant_b_id = $1
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `;

    const result = await pool.query(query, [userId]);

    const conversations = result.rows.map(row => ({
      id: row.id,
      created_at: row.created_at,
      last_message_at: row.last_message_at,
      contact: {
        id: row.contact_id,
        username: row.contact_username,
        avatar_url: row.contact_avatar_url,
        is_online: row.contact_is_online,
        last_seen: row.contact_last_seen
      }
    }));

    return res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    const beforeId = req.query.before;

    const checkResult = await pool.query(
      `SELECT id FROM conversations 
       WHERE id = $1 AND (participant_a_id = $2 OR participant_b_id = $2)`,
      [conversationId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT id, sender_id, content, is_read, read_at, created_at 
      FROM messages 
      WHERE conversation_id = $1
    `;
    const queryParams = [conversationId];

    if (beforeId) {
      query += ` AND created_at < (SELECT created_at FROM messages WHERE id = $2)`;
      queryParams.push(beforeId);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, queryParams);
    const messages = result.rows.reverse();

    return res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a message
router.delete('/messages/:id', async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const check = await pool.query(
      `SELECT id FROM messages WHERE id = $1 AND sender_id = $2`,
      [messageId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await pool.query(`DELETE FROM messages WHERE id = $1`, [messageId]);

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;