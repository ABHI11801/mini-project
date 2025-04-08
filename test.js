jest.mock('jszip', () => {
  return function () {
    return {
      file: jest.fn(),
      generateAsync: jest.fn().mockResolvedValue(Buffer.from('mock zip content'))
    };
  };
});
const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const bcryptjs = require('bcryptjs');


jest.setTimeout(50000);

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('fs');
jest.mock('child_process');
jest.mock('nodemailer');
jest.mock('axios');
jest.mock('@azure-rest/ai-inference');
jest.mock('@azure/core-auth');
jest.mock('mysql2');
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Generated content' } }],
        }),
      },
    },
  }));
});

const OpenAI = require('openai');

const mysql = require('mysql2');

const mockConnection = {
  connect: jest.fn((callback) => {
    // Simulate successful connection by default
    if (callback) callback(null);
    console.log('[MOCK] Connected to database');
    return Promise.resolve();
  }),
  query: jest.fn((query, params, callback) => {
    // If callback exists, assume callback style
    if (callback) {
      // Default empty response
      callback(null, []);
      return;
    }
    // If no callback, assume promise style
    return Promise.resolve([]);
  }),
  // Add any other methods your code might use
  end: jest.fn(),
  destroy: jest.fn()
};

// Set up the mock to return our mock connection
mysql.createConnection.mockReturnValue(mockConnection);


const app = require('./server.js');

describe('Express Server API Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Set environment variables
    process.env.PORT = 5500;
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key';
    process.env.DEEPSEEK = 'test-deepseek-key';

    // Set up file system mocks
    fs.readFile.mockImplementation((path, encoding, callback) => {
      callback(null, 'mock file content');
    });
    fs.writeFileSync.mockImplementation(() => { });
    fs.readFileSync.mockReturnValue(Buffer.from('test content'));
    fs.readdir.mockImplementation((path, callback) => {
      callback(null, ['file1.html', 'file2.css', 'file3.js']);
    });

    // Set up child process mocks
    const mockChildProcess = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
        return mockChildProcess;
      })
    };
    spawn.mockReturnValue(mockChildProcess);

    // Set up authentication mocks
    jwt.sign.mockReturnValue('test-token');
    jwt.verify.mockReturnValue({ user_id: 4, username: 'test2', email: 'test2@gmail.com' });

    bcryptjs.hash.mockResolvedValue('hashed-password');
    bcryptjs.compare.mockResolvedValue(true);
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/signup - should register a new user', async () => {
      console.log('Starting signup test');

      // Set up the specific mock responses for this test
      mockConnection.query
        .mockImplementationOnce((query, params, callback) => {
          console.log('First mock query called - checking if user exists');
          callback(null, []);  // No existing user found
        })
        .mockImplementationOnce((query, params, callback) => {
          console.log('Second mock query called - inserting new user');
          callback(null, { insertId: 5 });  // User created with ID 5
        });

      console.log('Sending request');
      const response = await request(app)
        .post('/api/signup')
        .send({
          username: 'test2',
          email: 'test2@gmail.com',
          password: 'test'
        });

      console.log('Response received', response.status);

      // Assertions
      expect(mockConnection.query).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({
        message: expect.stringContaining('registered')
      }));
    });
    test('POST /api/login - should authenticate user and return token', async () => {
      mockConnection.query
        .mockImplementationOnce((query, params, callback) => {
          callback(null, [{
            user_id: 4,
            user_name: 'test2',
            user_email: 'test2@gmail.com',
            user_password: 'hashed-password'
          }]);
        });
      console.log('login Query mock called');
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'test2@gmail.com',
          password: 'test'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        token: 'test-token',
        user: {
          id: 4,
          username: 'test2',
          email: 'test2@gmail.com'
        }
      });
      expect(bcryptjs.compare).toHaveBeenCalledWith('test', 'hashed-password');
      expect(jwt.sign).toHaveBeenCalled();
    });

    test('POST /api/check-email - should verify email exists', async () => {
      mockConnection.query
        .mockImplementationOnce((query, params, callback) => {
          callback(null, [{ user_id: 4 }]);
        });

      const response = await request(app)
        .post('/api/check-email')
        .send({ user_email: 'test2@gmail.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Email verified' });
    });
  });

  describe('Project Management Endpoints', () => {
    test('POST /api/save-project - should save a new project', async () => {
      mockConnection.query
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { insertId: 1 });
        });

      const pages = [
        { title: 'Home', content: 'Home page content' },
        { title: 'About', content: 'About page content' }
      ];

      pages.forEach(() => {
        mockConnection.query
          .mockImplementationOnce((query, params, callback) => {
            callback(null, { insertId: 1 });
          });
      });

      const response = await request(app)
        .post('/api/save-project')
        .send({
          proj_name: 'Test Project',
          user_id: 4,
          pages: pages
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Project and pages saved successfully',
        proj_id: 1
      });
      expect(mockConnection.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('Content Generation Endpoints', () => {
    test('POST /generate - should generate content with OpenAI', async () => {
      const response = await request(app)
        .post('/generate')
        .send({
          llm: 'openai',
          prompt: 'Generate a website',
          pagename: 'home',
          filename: 'index',
          pages: ['Home', 'About', 'Contact'],
          theme: 'modern',
        });
    
      expect(response.status).toBe(200);
      expect(response.body.generatedCode).toBe('Generated content');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalledWith('python', expect.any(Array));
    });
  });

  describe('Error Handling', () => {
    test('POST /api/login - should handle invalid credentials', async () => {
      mockConnection.query
        .mockImplementationOnce((query, params, callback) => {
          callback(null, [{
            user_id: 1,
            user_name: 'test2',
            user_email: 'test2@gmail.com',
            user_password: 'hashed-password'
          }]);
        });

      bcryptjs.compare.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'test2@gmail.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Incorrect password'
      });
    });


    test('POST /generate - should handle API errors', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValueOnce(new Error('API error'));

      const response = await request(app)
        .post('/generate')
        .send({
          llm: 'gemini',
          prompt: 'Generate a website',
          pagename: 'home',
          filename: 'index',
          pages: ['Home', 'About', 'Contact'],
          theme: 'modern'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error generating content');
    });
  });
});