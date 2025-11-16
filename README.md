# 📸 Instagram Automation API

<div align="center">

![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)

**🤖 Automated Instagram Management System**

*Streamline your Instagram workflow with AI-powered analytics, automated posting, and engagement tools*

**🌐 Production API:** `https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws`

[Features](#-features) • [Installation](#-installation) • [API Documentation](./API_DOCUMENTATION.md) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📦 Prerequisites](#-prerequisites)
- [🚀 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [📡 API Reference](#-api-reference)
- [💻 Usage Examples](#-usage-examples)
- [☁️ Deployment](#️-deployment)
- [🔒 Security](#-security)
- [🐛 Troubleshooting](#-troubleshooting)
- [📝 License](#-license)

---

## ✨ Features

### 🔐 **Authentication & Session Management**
- ✅ Secure Instagram login with 2FA support
- 🔄 Automatic session persistence
- 🛡️ Session validation middleware
- 👤 User credential management

### 📊 **AI-Powered Analytics**
- 🤖 Gemini AI integration for screenshot analysis
- 📈 Comprehensive post analytics extraction
- 📉 Engagement metrics tracking
- 📍 Audience insights breakdown

### 📤 **Content Management**
- 🖼️ Automated post uploads (Images & Videos)
- ✍️ Caption support with hashtags
- 📁 Multiple file format support (JPEG, PNG, MP4, QuickTime)
- 📝 Upload history tracking

### 🔥 **Engagement Automation**
- 💬 Automated warm-up activities
- ❤️ Smart post interactions
- 💭 Comment automation
- ⏱️ Configurable duration controls

### 🌐 **Serverless Ready**
- ☁️ AWS Lambda compatible
- ⚡ Azure Functions support
- 📦 Lightweight deployment
- 🔄 Auto-scaling capabilities

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js |
| **Database** | MongoDB (Mongoose) |
| **Browser Automation** | Puppeteer Core + Chromium |
| **AI Integration** | OpenRouter API (Gemini 2.5 Flash) |
| **File Upload** | Multer |
| **Serverless** | Serverless Framework |
| **HTTP Adapter** | Serverless HTTP |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.x
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **Git**

### Optional but Recommended:
- 🌐 **Proxy Server** (for enhanced security)
- 🔑 **OpenRouter API Key** (for AI analytics)

---

## 🚀 Installation

### 1️⃣ **Clone the Repository**

```bash
git clone https://github.com/yourusername/instagram-automation.git
cd instagram-automation
```

### 2️⃣ **Install Dependencies**

```bash
npm install
```

### 3️⃣ **Environment Setup**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

### 4️⃣ **Configure Environment Variables**

Edit `.env` with your credentials:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/instagram_automation

# AI Analytics (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Proxy Configuration (Optional)
PROXY_SERVER=http://your-proxy-server:port
PROXY_USERNAME=proxy_username
PROXY_PASSWORD=proxy_password
```

### 5️⃣ **Start the Server**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

🎉 **Server is now running on** `http://localhost:3001`

---

## ⚙️ Configuration

### 📁 Project Structure

```
instagram-automation/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controller/
│   │   ├── Login.js             # Authentication handler
│   │   ├── UploadFile.js        # Post upload handler
│   │   ├── GetAnalytic.js       # Analytics handler
│   │   └── WrampUp.js           # Engagement handler
│   ├── middleware/
│   │   └── sessionMiddleware.js # Session validation
│   ├── models/
│   │   ├── UserSession.js       # User model
│   │   └── Upload.js            # Upload history model
│   └── utlis/
│       ├── Browser.js            # Puppeteer browser instance
│       ├── login.js             # Login utilities
│       ├── SessionManager.js    # Session management
│       └── waitFor.js           # Async utilities
├── tmp/                         # Temporary files (screenshots, uploads)
├── index.js                     # Express app entry point
├── fileUpload.js                # Multer configuration
└── package.json
```

### 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ Yes | MongoDB connection string |
| `OPENROUTER_API_KEY` | ✅ Yes | OpenRouter API key for AI analytics |
| `JWT_SECRET` | ✅ Yes | Secret key for JWT tokens |
| `PROXY_SERVER` | ❌ No | Proxy server URL |
| `PROXY_USERNAME` | ❌ No | Proxy authentication username |
| `PROXY_PASSWORD` | ❌ No | Proxy authentication password |

---

## 📡 API Reference

### 🌐 Production Base URL
```
https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws
```

### Local Development Base URL
```
http://localhost:3001
```

> 📚 **For complete API documentation with detailed examples, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

### 🔐 Authentication Endpoints

#### **POST** `/instagram/login`
Login to Instagram and create a session.

**Request Body:**
```json
{
  "username": "your_instagram_username",
  "password": "your_instagram_password",
  "instagram2faSecret": "optional_2fa_secret"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "sessionId": "session_id_here",
  "username": "your_instagram_username"
}
```

---

### 📤 Content Upload Endpoints

#### **POST** `/instagram/upload`
Upload a post to Instagram.

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image or video file (required)
- `caption`: Post caption (required)

**Supported Formats:**
- Images: JPEG, PNG, AVIF, HEIC, HEIF
- Videos: MP4, QuickTime (MOV)

**Response:**
```json
{
  "success": true,
  "message": "Post uploaded successfully",
  "postId": "instagram_post_id",
  "uploadId": "upload_record_id"
}
```

---

### 📊 Analytics Endpoints

#### **POST** `/instagram/analytic`
Get AI-powered analytics for an Instagram post.

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "postId": "instagram_post_id"
}
```

**Response:**
```json
{
  "success": true,
  "postId": "instagram_post_id",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "analytics": {
    "accounts_reached": 1000,
    "impressions": 1500,
    "likes": 250,
    "comments": 15,
    "shares": 5,
    "saves": 30,
    "profile_visits": 50,
    "follows": 10,
    "engagement_rate": "18.5%",
    "reach_breakdown": {
      "followers": 800,
      "non_followers": 200
    },
    "impressions_breakdown": {
      "from_home": 1000,
      "from_hashtags": 300,
      "from_profile": 150,
      "from_explore": 50
    }
  }
}
```

---

### 🔥 Engagement Endpoints

#### **POST** `/instagram/wrampUp`
Perform automated warm-up activities to increase engagement.

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "durationMinutes": 8
}
```

**Response:**
```json
{
  "success": true,
  "message": "Warm-up completed",
  "postsInteracted": 15,
  "duration": "8 minutes"
}
```

---

### 🏥 Health Check

#### **GET** `/health`
Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Lambda function is running"
}
```

---

## 💻 Usage Examples

### 🔐 Example 1: Login to Instagram

```javascript
const axios = require('axios');

const response = await axios.post('http://localhost:3001/instagram/login', {
  username: 'your_username',
  password: 'your_password',
  instagram2faSecret: 'optional_2fa_secret'
});

const sessionToken = response.data.sessionId;
console.log('✅ Logged in successfully!');
```

### 📤 Example 2: Upload a Post

```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('path/to/image.jpg'));
form.append('caption', 'Amazing sunset! 🌅 #photography #sunset');

const response = await axios.post(
  'http://localhost:3001/instagram/upload',
  form,
  {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);

console.log('✅ Post uploaded!', response.data.postId);
```

### 📊 Example 3: Get Analytics

```javascript
const response = await axios.post(
  'http://localhost:3001/instagram/analytic',
  { postId: 'instagram_post_id' },
  {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);

console.log('📊 Analytics:', response.data.analytics);
```

### 🔥 Example 4: Warm-up Activity

```javascript
const response = await axios.post(
  'http://localhost:3001/instagram/wrampUp',
  { durationMinutes: 10 },
  {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);

console.log('🔥 Warm-up completed!', response.data);
```

---

## ☁️ Deployment

### 🚀 AWS Lambda Deployment

#### 1. **Install Serverless Framework**

```bash
npm install -g serverless
```

#### 2. **Configure AWS Credentials**

```bash
aws configure
```

#### 3. **Deploy**

```bash
npm run deploy
```

### ☁️ Azure Functions Deployment

#### 1. **Install Azure Functions Core Tools**

```bash
npm install -g azure-functions-core-tools@4
```

#### 2. **Login to Azure**

```bash
az login
```

#### 3. **Create Function App**

```bash
az functionapp create \
  --resource-group instagram-automation-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name instagram-automation-func \
  --storage-account instagramautomationstorage
```

#### 4. **Configure Environment Variables**

```bash
az functionapp config appsettings set \
  --name instagram-automation-func \
  --resource-group instagram-automation-rg \
  --settings \
    MONGODB_URI="your-mongodb-uri" \
    OPENROUTER_API_KEY="your-api-key" \
    JWT_SECRET="your-jwt-secret"
```

#### 5. **Deploy**

```bash
func azure functionapp publish instagram-automation-func
```

---

## 🔒 Security

### 🛡️ Best Practices

- ✅ **Never commit** `.env` files to version control
- 🔐 Use strong, unique passwords
- 🔑 Rotate API keys regularly
- 🌐 Use proxy servers for enhanced privacy
- 🚫 Implement rate limiting in production
- 📝 Monitor API usage and logs

### 🔐 Session Management

- Sessions are stored in MongoDB
- JWT tokens for API authentication
- Automatic session expiration
- Secure credential storage

---

## 🐛 Troubleshooting

### ❌ Common Issues

#### **MongoDB Connection Error**
```
❌ MongoDB connection error
```
**Solution:** Check your `MONGODB_URI` in `.env` file

#### **OpenRouter API Key Error**
```
❌ OPENROUTER_API_KEY not configured
```
**Solution:** Add your OpenRouter API key to `.env` file

#### **Puppeteer Launch Error**
```
❌ Browser launch failed
```
**Solution:** Ensure Chromium dependencies are installed

#### **Session Expired**
```
❌ Session not found or expired
```
**Solution:** Re-login to create a new session

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

Need help? Open an issue on GitHub or contact the maintainers.

---

<div align="center">

**Made with ❤️ for Instagram Automation**

⭐ Star this repo if you find it helpful!

[⬆ Back to Top](#-instagram-automation-api)

</div>

