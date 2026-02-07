import express from 'express';
import passport from '../config/passport';
import { getCurrentUser, logout } from '../controllers/authController';

const router = express.Router();

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  }
);

// Get current user
router.get('/me', getCurrentUser);

// Logout
router.post('/logout', logout);

export default router;
