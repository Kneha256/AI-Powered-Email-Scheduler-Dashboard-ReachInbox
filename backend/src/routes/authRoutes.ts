import express from 'express';

const router = express.Router();

/**
 * TEMPORARY AUTH (no Google, no Passport)
 * This keeps your backend deployable on Render.
 * We can restore real Google OAuth later.
 */

// Simple demo login so frontend can work
router.post('/login', (req, res) => {
  res.json({
    user: {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User'
    }
  });
});

// Fake "current user" endpoint
router.get('/me', (req, res) => {
  res.json({
    user: {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User'
    }
  });
});

// Simple logout (just responds OK)
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
