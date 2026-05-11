import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import pool from '../db/connect.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authMiddleware);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== 'string') return res.json([]);
    const currentUserId = req.user.id;
    const searchTerm = `%${q}%`;
    const result = await pool.query(
      `SELECT id, username, avatar_url, is_online 
       FROM users 
       WHERE username ILIKE $1 AND id != $2 
       LIMIT 50`,
      [searchTerm, currentUserId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, avatar_url, is_online, last_seen, created_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload avatar
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await pool.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2`,
      [avatarUrl, req.user.id]
    );

    return res.json({ avatar_url: avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update username
router.patch('/me', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    const result = await pool.query(
      `UPDATE users SET username = $1 WHERE id = $2 
       RETURNING id, username, email, avatar_url`,
      [username, req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;