import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
// ❌ DISABLED: Google Passport for now
// import passport from './config/passport';

import { initDatabase } from './config/database';
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (keep this — it’s fine)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// ❌ DISABLED: Passport (prevents Google errors)
// app.use(passport.initialize());
// app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);

// Health check (very useful on Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
async function startServer() {
  try {
    // ❌ DISABLED DATABASE FOR RENDER DEPLOY
    // await initDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
