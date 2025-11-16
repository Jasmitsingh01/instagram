import express from 'express';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
dotenv.config();

import connectDB from './src/config/database.js';
import Login from './src/controller/Login.js';
import uploadFile from './src/controller/UploadFile.js';
import wrampUp from './src/controller/WrampUp.js';
import fileUpload from './fileUpload.js';
import {requireSession} from './src/middleware/sessionMiddleware.js';
import GetAnalytic from './src/controller/GetAnalytic.js';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.post('/instagram/analytic', requireSession, GetAnalytic);
app.post('/instagram/login', Login);
app.post('/instagram/upload', fileUpload.single('file'), requireSession, uploadFile);
app.post('/instagram/wrampUp', requireSession, wrampUp);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lambda function is running'
  });
});

// Error handlers
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message
  });
});

// Export Lambda handler
export const handler = serverless(app);
