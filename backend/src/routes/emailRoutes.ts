import express from 'express';
import multer from 'multer';
import { scheduleEmails, getScheduledEmails, getSentEmails, parseCSVFile } from '../controllers/emailController';
import { isAuthenticated } from '../utils/authMiddleware';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Schedule emails
router.post('/schedule', isAuthenticated, upload.single('file'), scheduleEmails);

// Get scheduled emails
router.get('/scheduled', isAuthenticated, getScheduledEmails);

// Get sent emails
router.get('/sent', isAuthenticated, getSentEmails);

// Parse CSV
router.post('/parse-csv', isAuthenticated, upload.single('file'), parseCSVFile);

export default router;
