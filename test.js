const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('fs');
jest.mock('child_process');
jest.mock('nodemailer');
jest.mock('axios');
jest.mock('@azure-rest/ai-inference');
jest.mock('@azure/core-auth');
jest.mock('mysql2');

// Import the application after mocking dependencies
const app = require('../app');

describe('Express Server API Tests', () => {
  let mockDB;
  let mockConnection;
  let mockQuery;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup MySQL mock
    mockQuery = jest.fn();
    mockConnection = {
      query: mockQuery,
      connect: jest.fn()
    };
    mockDB = require('mysql2').createConnection.mockReturnValue(mockConnection);
    
    // Mock environment variables
    process.env.PORT = 5500;
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key';
    process.env.DEEPSEEK = 'test-deepseek-key';
    
    // Mock fs functions
    fs.readFile.mockImplementation((path, encoding, callback) => {
      callback(null, 'mock file content');
    });
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockReturnValue(Buffer.from('test content'));
    fs.readdir.mockImplementation((path, callback) => {
      callback(null, ['file1.html', 'file2.css', 'file3.js']);
    });
    
    // Mock child_process.spawn
    const mockChildProcess = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
        return mockChildProcess;
      })
    };
    spawn.mockReturnValue(mockChildProcess);
    
    // Mock JWT
    jwt.sign.mockReturnValue('test-token');
    jwt.verify.mockReturnValue({ user_id: 1, username: 'testuser', email: 'test@example.com' });
    
    // Mock bcrypt
    bcrypt.hash.mockResolvedValue('hashed-password');
    bcrypt.compare.mockResolvedValue(true);
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/signup - should register a new user', async () => {
      // Mock DB query to simulate checking for existing user
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, []); // No existing user found
      });
      
      // Mock DB query for inserting user
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, { insertId: 1 });
      });
      
      const response = await request(app)
        .post('/api/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully'
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
    
    test('POST /api/login - should authenticate user and return token', async () => {
      // Mock DB query to return user
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [{
          user_id: 1,
          user_name: 'testuser',
          user_email: 'test@example.com',
          user_password: 'hashed-password'
        }]);
      });
      
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        token: 'test-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com'
        }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(jwt.sign).toHaveBeenCalled();
    });
    
    test('POST /api/check-email - should verify email exists', async () => {
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [{ user_id: 1 }]);
      });
      
      const response = await request(app)
        .post('/api/check-email')
        .send({ user_email: 'test@example.com' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Email verified' });
    });
  });

  describe('Project Management Endpoints', () => {
    test('POST /api/save-project - should save a new project', async () => {
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, { insertId: 1 });
      });
      
      const pages = [
        { title: 'Home', content: 'Home page content' },
        { title: 'About', content: 'About page content' }
      ];
      
      // Mock page insertions
      pages.forEach(() => {
        mockQuery.mockImplementationOnce((query, params, callback) => {
          callback(null, { insertId: 1 });
        });
      });
      
      const response = await request(app)
        .post('/api/save-project')
        .send({
          proj_name: 'Test Project',
          user_id: 1,
          pages: pages
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Project and pages saved successfully',
        proj_id: 1
      });
      expect(mockQuery).toHaveBeenCalledTimes(3); // 1 for project, 2 for pages
    });
    
    test('GET /api/user-projects - should fetch all user projects', async () => {
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [
          { proj_id: 1, proj_name: 'Project 1', created_at: '2023-01-01 12:00:00' },
          { proj_id: 2, proj_name: 'Project 2', created_at: '2023-01-02 12:00:00' }
        ]);
      });
      
      const response = await request(app)
        .get('/api/user-projects')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(2);
      expect(jwt.verify).toHaveBeenCalledWith('test-token', expect.any(String));
    });
    
    test('GET /api/project/:id - should fetch project details', async () => {
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [{ proj_id: 1, proj_name: 'Test Project' }]);
      });
      
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [
          { pages_id: 1, proj_id: 1, pages_name: 'Home', pages_description: 'Home content' },
          { pages_id: 2, proj_id: 1, pages_name: 'About', pages_description: 'About content' }
        ]);
      });
      
      const response = await request(app)
        .get('/api/project/1');
      
      expect(response.status).toBe(200);
      expect(response.body.project).toBeDefined();
      expect(response.body.pages).toHaveLength(2);
    });
  });

  describe('Content Generation Endpoints', () => {
    test('POST /generate - should generate content with OpenAI', async () => {
      // Mock OpenAI response
      const openaiMock = require('openai');
      openaiMock.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Generated content' } }]
            })
          }
        }
      }));
      
      const response = await request(app)
        .post('/generate')
        .send({
          llm: 'openai',
          prompt: 'Generate a website',
          pagename: 'home',
          filename: 'index',
          pages: ['Home', 'About', 'Contact'],
          theme: 'modern'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.generatedCode).toBe('Generated content');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalledWith('python', expect.any(Array));
    });
    
    test('GET /download-zip - should create and send a zip file', async () => {
      // Mock JSZip
      jest.mock('jszip', () => {
        return function() {
          return {
            file: jest.fn(),
            generateAsync: jest.fn().mockResolvedValue(Buffer.from('mock zip content'))
          };
        };
      });
      
      const response = await request(app)
        .get('/download-zip');
      
      expect(response.status).toBe(200);
      expect(response.header['content-type']).toBe('application/zip');
      expect(response.header['content-disposition']).toBe('attachment; filename=output.zip');
    });
  });

  describe('Password Reset Flow', () => {
    test('POST /api/generate-code - should generate and send verification code', async () => {
      const nodemailer = require('nodemailer');
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-id' });
      nodemailer.createTransport.mockReturnValue({
        sendMail: mockSendMail
      });
      
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, { insertId: 1 });
      });
      
      const response = await request(app)
        .post('/api/generate-code')
        .send({ user_email: 'test@example.com' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Verification code sent to your email');
      expect(mockSendMail).toHaveBeenCalled();
    });
    
    test('POST /api/reset-password - should update user password', async () => {
      // Mock code verification query
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [{ code_id: 1, user_email: 'test@example.com', verification_code: '123456' }]);
      });
      
      // Mock password update query
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, { affectedRows: 1 });
      });
      
      // Mock mark code as used
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, { affectedRows: 1 });
      });
      
      const response = await request(app)
        .post('/api/reset-password')
        .send({
          user_email: 'test@example.com',
          code: '123456',
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successful');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
    });
  });

  describe('User Profile Management', () => {
    test('GET /api/user-profile - should return user profile', async () => {
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [{ user_name: 'testuser', user_email: 'test@example.com' }]);
      });
      
      const response = await request(app)
        .get('/api/user-profile')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        username: 'testuser',
        email: 'test@example.com'
      });
    });
    
    test('POST /api/update-profile - should update user profile', async () => {
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, { affectedRows: 1 });
      });
      
      const response = await request(app)
        .post('/api/update-profile')
        .set('Authorization', 'Bearer test-token')
        .send({
          username: 'updateduser',
          email: 'updated@example.com'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile updated successfully');
    });
    
    test('DELETE /api/delete-account - should delete user account', async () => {
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, { affectedRows: 1 });
      });
      
      const response = await request(app)
        .delete('/api/delete-account')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted successfully');
    });
  });

  describe('Error Handling', () => {
    test('POST /api/login - should handle invalid credentials', async () => {
      // Mock DB query to return user
      mockQuery.mockImplementationOnce((query, params, callback) => {
        callback(null, [{
          user_id: 1,
          user_name: 'testuser',
          user_email: 'test@example.com',
          user_password: 'hashed-password'
        }]);
      });
      
      // Mock password comparison to fail
      bcrypt.compare.mockResolvedValueOnce(false);
      
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Incorrect password'
      });
    });
    
    test('GET /api/user-projects - should handle invalid token', async () => {
      // Mock JWT verification to throw an error
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      const response = await request(app)
        .get('/api/user-projects')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
    
    test('POST /generate - should handle API errors', async () => {
      // Mock axios to simulate API error
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