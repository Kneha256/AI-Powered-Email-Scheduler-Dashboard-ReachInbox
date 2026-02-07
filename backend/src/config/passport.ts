import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './database';
import { RowDataPacket } from 'mysql2';

interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar: string;
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    done(null, rows[0] as User);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        const [existingUsers] = await pool.query<RowDataPacket[]>(
          'SELECT * FROM users WHERE google_id = ?',
          [profile.id]
        );

        if (existingUsers.length > 0) {
          return done(null, existingUsers[0] as User);
        }

        // Create new user
        const [result] = await pool.query(
          'INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)',
          [
            profile.id,
            profile.emails?.[0]?.value || '',
            profile.displayName,
            profile.photos?.[0]?.value || ''
          ]
        );

        const [newUser] = await pool.query<RowDataPacket[]>(
          'SELECT * FROM users WHERE id = ?',
          [(result as any).insertId]
        );

        done(null, newUser[0] as User);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  )
);

export default passport;
