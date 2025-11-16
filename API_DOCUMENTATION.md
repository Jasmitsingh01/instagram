# 📚 Instagram Automation API - Complete Documentation

<div align="center">

![AWS Lambda](https://img.shields.io/badge/AWS_Lambda-FF9900?style=for-the-badge&logo=aws-lambda&logoColor=white)
![API](https://img.shields.io/badge/API-REST-FF6B6B?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live-00C853?style=for-the-badge)

**🌐 Production API Endpoint**

```
https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws
```

[Quick Start](#-quick-start) • [Authentication](#-authentication) • [Endpoints](#-api-endpoints) • [Examples](#-code-examples)

</div>

---

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🔐 Authentication](#-authentication)
- [📡 API Endpoints](#-api-endpoints)
  - [Health Check](#-health-check)
  - [Login](#-login)
  - [Upload Post](#-upload-post)
  - [Get Analytics](#-get-analytics)
  - [Warm-up Engagement](#-warm-up-engagement)
- [💻 Code Examples](#-code-examples)
- [📊 Response Formats](#-response-formats)
- [⚠️ Error Handling](#️-error-handling)
- [🔒 Security](#-security)
- [📝 Rate Limits](#-rate-limits)

---

## 🚀 Quick Start

### Base URL
```
https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws
```

### Authentication Flow
1. **Login** → Get session established
2. **Use Session** → Include `username` in request body for protected endpoints
3. **Upload/Analytics** → Use authenticated session

---

## 🔐 Authentication

### Session-Based Authentication

This API uses **session-based authentication** where:
- Sessions are stored in MongoDB
- Each user session is tied to a username
- Sessions persist across requests
- Sessions are automatically restored when valid

### How It Works

1. **Login** creates/restores an Instagram session
2. **Protected endpoints** require a valid session
3. **Session validation** happens automatically via middleware
4. **Session restoration** attempts to reuse existing sessions

---

## 📡 API Endpoints

### 🏥 Health Check

Check if the API is running and accessible.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Request:**
```bash
curl https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/health
```

**Response:**
```json
{
  "success": true,
  "message": "Lambda function is running"
}
```

**Status Codes:**
- `200 OK` - API is running

---

### 🔐 Login

Authenticate with Instagram and create/restore a session.

**Endpoint:** `POST /instagram/login`

**Authentication:** Not required (creates session)

**Request Body:**
```json
{
  "username": "your_instagram_username",
  "password": "your_instagram_password",
  "instagram2faSecret": "optional_2fa_secret"
}
```

**cURL Example:**
```bash
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "sessionSaved": true,
  "sessionId": "session_id_here",
  "username": "your_instagram_username"
}
```

**Session Restored Response (200):**
```json
{
  "success": true,
  "message": "Session restored successfully - already logged in",
  "sessionRestored": true,
  "sessionDetails": {
    "isLoggedIn": true,
    "reason": "Found 5 logged-in indicators",
    "checks": {
      "hasProfilePicture": true,
      "hasNewPostButton": true,
      "hasDirectMessages": true,
      "hasCreateButton": true,
      "hasHomeButton": true
    }
  },
  "username": "your_instagram_username"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Username and password are required"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Login failed: [error details]"
}
```

**Features:**
- ✅ Automatic session restoration if valid session exists
- ✅ 2FA support with `instagram2faSecret`
- ✅ Session persistence in MongoDB
- ✅ Enhanced session validation with multiple indicators
- ✅ Proxy authentication support

---

### 📤 Upload Post

Upload an image or video post to Instagram.

**Endpoint:** `POST /instagram/upload`

**Authentication:** Required (session)

**Content-Type:** `multipart/form-data`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | ✅ Yes | Image or video file |
| `caption` | String | ✅ Yes | Post caption text |
| `username` | String | ✅ Yes | Instagram username (for session) |

**Supported File Formats:**
- **Images:** JPEG, JPG, PNG, AVIF, HEIC, HEIF
- **Videos:** MP4, QuickTime (MOV)
- **Max File Size:** 5MB

**cURL Example:**
```bash
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/upload \
  -F "file=@/path/to/image.jpg" \
  -F "caption=Amazing sunset! 🌅 #photography #sunset" \
  -F "username=your_username"
```

**JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('caption', 'My awesome post!');
formData.append('username', 'your_username');

fetch('https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/upload', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Instagram post uploaded successfully",
  "filePath": "/tmp/media-1234567890.jpg",
  "caption": "Amazing sunset! 🌅 #photography #sunset",
  "insightsUrl": "https://www.instagram.com/insights/media/1234567890/"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "message": "File and caption are required"
}
```

**400 Invalid File Type:**
```json
{
  "success": false,
  "message": "Unsupported file type: application/pdf. Supported formats: JPEG, PNG, AVIF, HEIC, HEIF, MP4, QuickTime"
}
```

**401 Unauthorized (Session Expired):**
```json
{
  "success": false,
  "message": "Instagram session expired. Please login again.",
  "requiresLogin": true,
  "uploadId": "upload_record_id",
  "sessionDetails": {
    "isLoggedIn": false,
    "reason": "Login form detected"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "[error message]",
  "uploadId": "upload_record_id",
  "errorType": "Error"
}
```

**Upload Process:**
1. ✅ File validation (type, size, extension)
2. ✅ Session validation
3. ✅ Navigate to Instagram create post
4. ✅ Upload file
5. ✅ Add caption
6. ✅ Share post
7. ✅ Navigate to insights (if available)
8. ✅ Return post details

**Features:**
- ✅ Automatic file validation
- ✅ Session validation before upload
- ✅ Full upload workflow automation
- ✅ Automatic insights URL capture
- ✅ Upload history tracking in database
- ✅ Processing step tracking

---

### 📊 Get Analytics

Get AI-powered analytics for an Instagram post using Gemini AI.

**Endpoint:** `POST /instagram/analytic`

**Authentication:** Required (session)

**Request Body:**
```json
{
  "postId": "instagram_post_id",
  "username": "your_instagram_username"
}
```

**cURL Example:**
```bash
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/analytic \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "3760021767063173267",
    "username": "your_username"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "postId": "3760021767063173267",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "analytics": {
    "accounts_reached": 1000,
    "impressions": 1500,
    "likes": 250,
    "comments": 15,
    "shares": 5,
    "saves": 30,
    "profile_visits": 50,
    "follows": 10,
    "website_clicks": 5,
    "email_clicks": 2,
    "text_message_clicks": 1,
    "get_directions_clicks": 0,
    "call_clicks": 0,
    "reach_breakdown": {
      "followers": 800,
      "non_followers": 200
    },
    "impressions_breakdown": {
      "from_home": 1000,
      "from_hashtags": 300,
      "from_profile": 150,
      "from_explore": 50,
      "from_other": 0
    },
    "audience_insights": {
      "top_locations": [],
      "age_range": {},
      "gender_breakdown": {},
      "most_active_times": []
    },
    "engagement_rate": "18.5%",
    "post_performance": {
      "compared_to_average": "Above average",
      "performance_indicator": "Good"
    },
    "story_metrics": {
      "story_impressions": null,
      "story_reach": null,
      "story_exits": null,
      "story_replies": null,
      "story_shares": null
    },
    "additional_metrics": {},
    "screenshotPath": "tmp/instagram-analytics-3760021767063173267-1234567890.png"
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Missing required parameters",
  "message": "postId is required"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "[error details]"
}
```

**AI Analysis Errors:**

**API Key Not Configured:**
```json
{
  "error": "API key not configured",
  "message": "OPENROUTER_API_KEY environment variable is required",
  "note": "Get your API key from https://openrouter.ai/keys and add it to .env file"
}
```

**Authentication Failed:**
```json
{
  "error": "Authentication failed",
  "message": "Invalid or expired OPENROUTER_API_KEY",
  "statusCode": 401,
  "solution": "Check your API key at https://openrouter.ai/keys"
}
```

**Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests to OpenRouter API",
  "statusCode": 429,
  "solution": "Wait a few minutes before trying again"
}
```

**Insufficient Credits:**
```json
{
  "error": "Insufficient credits",
  "message": "Your OpenRouter account needs credits",
  "statusCode": 402,
  "solution": "Add credits to your OpenRouter account"
}
```

**Features:**
- ✅ AI-powered screenshot analysis using Gemini 2.5 Flash
- ✅ Automatic screenshot capture of analytics page
- ✅ Comprehensive metrics extraction
- ✅ Engagement rate calculation
- ✅ Reach and impressions breakdown
- ✅ Audience insights extraction
- ✅ Screenshot saved for reference

---

### 🔥 Warm-up Engagement

Perform automated engagement activities to warm up your Instagram account.

**Endpoint:** `POST /instagram/wrampUp`

**Authentication:** Required (session)

**Request Body:**
```json
{
  "durationMinutes": 8,
  "username": "your_instagram_username"
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `durationMinutes` | Number | ❌ No | 8 | Duration in minutes |
| `username` | String | ✅ Yes | - | Instagram username |

**cURL Example:**
```bash
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/wrampUp \
  -H "Content-Type: application/json" \
  -d '{
    "durationMinutes": 10,
    "username": "your_username"
  }'
```

**Success Response (200):**
```json
{
  "postsInteracted": 15,
  "attempts": 20,
  "durationSeconds": 600
}
```

**Error Response (500):**
```json
{
  "postsInteracted": 0,
  "attempts": 0,
  "durationSeconds": 0
}
```

**Features:**
- ✅ Automated liking posts
- ✅ Automated commenting with random messages
- ✅ Natural scrolling behavior
- ✅ Random action selection (like, comment, or both)
- ✅ Periodic breaks to avoid detection
- ✅ Configurable duration
- ✅ Real-time progress tracking

**Engagement Actions:**
- **Like:** Randomly likes visible posts
- **Comment:** Posts random comments from predefined list
- **Both:** Performs both like and comment actions
- **Break:** Takes breaks every 3 interactions

**Comment Pool:**
- "Great post!"
- "I love this!"
- "Awesome content!"
- "Thanks for sharing!"
- "Keep it up!"
- "Nice post!"
- "Awesome work!"
- "Amazing!"
- "Incredible!"
- "Superb!"
- "Brilliant!"
- "Wonderful!"
- "Fabulous!"
- "Spectacular!"
- "Marvelous!"

---

## 💻 Code Examples

### JavaScript/Node.js

#### Complete Workflow Example

```javascript
const BASE_URL = 'https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws';
const username = 'your_instagram_username';
const password = 'your_password';

// 1. Login
async function login() {
  const response = await fetch(`${BASE_URL}/instagram/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  console.log('Login:', data);
  return data;
}

// 2. Upload Post
async function uploadPost(file, caption) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caption', caption);
  formData.append('username', username);
  
  const response = await fetch(`${BASE_URL}/instagram/upload`, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  console.log('Upload:', data);
  return data;
}

// 3. Get Analytics
async function getAnalytics(postId) {
  const response = await fetch(`${BASE_URL}/instagram/analytic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, username })
  });
  
  const data = await response.json();
  console.log('Analytics:', data);
  return data;
}

// 4. Warm-up
async function warmUp(durationMinutes = 8) {
  const response = await fetch(`${BASE_URL}/instagram/wrampUp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ durationMinutes, username })
  });
  
  const data = await response.json();
  console.log('Warm-up:', data);
  return data;
}

// Usage
(async () => {
  // Login first
  await login();
  
  // Upload a post
  const fileInput = document.querySelector('input[type="file"]');
  const uploadResult = await uploadPost(fileInput.files[0], 'My awesome post!');
  
  // Get analytics (if you have postId)
  // const analytics = await getAnalytics('post_id_here');
  
  // Warm-up account
  await warmUp(10);
})();
```

### Python

```python
import requests
import json

BASE_URL = "https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws"
username = "your_instagram_username"
password = "your_password"

# 1. Login
def login():
    response = requests.post(
        f"{BASE_URL}/instagram/login",
        json={"username": username, "password": password}
    )
    return response.json()

# 2. Upload Post
def upload_post(file_path, caption):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {
            'caption': caption,
            'username': username
        }
        response = requests.post(
            f"{BASE_URL}/instagram/upload",
            files=files,
            data=data
        )
    return response.json()

# 3. Get Analytics
def get_analytics(post_id):
    response = requests.post(
        f"{BASE_URL}/instagram/analytic",
        json={"postId": post_id, "username": username}
    )
    return response.json()

# 4. Warm-up
def warm_up(duration_minutes=8):
    response = requests.post(
        f"{BASE_URL}/instagram/wrampUp",
        json={"durationMinutes": duration_minutes, "username": username}
    )
    return response.json()

# Usage
if __name__ == "__main__":
    # Login
    login_result = login()
    print("Login:", login_result)
    
    # Upload post
    upload_result = upload_post("image.jpg", "My awesome post!")
    print("Upload:", upload_result)
    
    # Get analytics
    analytics = get_analytics("post_id_here")
    print("Analytics:", analytics)
    
    # Warm-up
    warmup_result = warm_up(10)
    print("Warm-up:", warmup_result)
```

### cURL Examples

```bash
# Health Check
curl https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/health

# Login
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Upload Post
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/upload \
  -F "file=@image.jpg" \
  -F "caption=My post caption" \
  -F "username=your_username"

# Get Analytics
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/analytic \
  -H "Content-Type: application/json" \
  -d '{"postId":"1234567890","username":"your_username"}'

# Warm-up
curl -X POST https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws/instagram/wrampUp \
  -H "Content-Type: application/json" \
  -d '{"durationMinutes":10,"username":"your_username"}'
```

---

## 📊 Response Formats

### Success Response Structure

All successful responses follow this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* endpoint-specific data */ }
}
```

### Error Response Structure

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Error type (optional)",
  "requiresLogin": true // if session-related
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Status Code | Description | Solution |
|-------------|-------------|----------|
| `200` | Success | - |
| `400` | Bad Request | Check request parameters |
| `401` | Unauthorized | Login required |
| `404` | Not Found | Check endpoint URL |
| `500` | Internal Server Error | Check API logs or retry |

### Error Response Examples

**Missing Parameters:**
```json
{
  "success": false,
  "message": "Username and password are required"
}
```

**Session Expired:**
```json
{
  "success": false,
  "message": "No valid session found. Please login first.",
  "requiresLogin": true
}
```

**File Upload Error:**
```json
{
  "success": false,
  "message": "File and caption are required"
}
```

**Internal Server Error:**
```json
{
  "success": false,
  "message": "[detailed error message]"
}
```

---

## 🔒 Security

### Best Practices

1. **Never expose credentials** in client-side code
2. **Use HTTPS** for all requests (already enforced)
3. **Store credentials securely** in environment variables
4. **Rotate passwords** regularly
5. **Monitor API usage** for suspicious activity
6. **Use proxy servers** for enhanced privacy (optional)

### Session Security

- Sessions are stored securely in MongoDB
- Sessions are validated before each protected request
- Sessions automatically expire if invalid
- Session restoration attempts to reuse valid sessions

### File Upload Security

- File type validation (whitelist approach)
- File size limits (5MB max)
- File extension validation
- SHA-256 hash generation for integrity

---

## 📝 Rate Limits

### Current Limits

- **No explicit rate limits** set on the API
- **AWS Lambda** has default concurrency limits
- **OpenRouter API** has rate limits for analytics
- **Instagram** may rate limit based on activity

### Recommendations

- Space out requests by at least 2-3 seconds
- Don't make rapid successive requests
- Monitor for rate limit errors (429 status codes)
- Implement exponential backoff for retries

---

## 🔧 Environment Variables

The API uses the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ Yes | MongoDB connection string |
| `OPENROUTER_API_KEY` | ✅ Yes | OpenRouter API key for AI analytics |
| `JWT_SECRET` | ✅ Yes | JWT secret for token generation |
| `PROXY_SERVER` | ❌ No | Proxy server URL |
| `PROXY_USERNAME` | ❌ No | Proxy authentication username |
| `PROXY_PASSWORD` | ❌ No | Proxy authentication password |

---

## 📞 Support

For issues, questions, or contributions:

1. Check the error messages for specific solutions
2. Verify your request format matches the documentation
3. Ensure your session is valid (login if needed)
4. Check API status with `/health` endpoint

---

<div align="center">

**📚 API Documentation v1.0**

*Last Updated: January 2024*

**🌐 Production Endpoint:** `https://2dvyfuz2cv5fufbddnkk55ah6m0czpew.lambda-url.us-east-1.on.aws`

[⬆ Back to Top](#-instagram-automation-api---complete-documentation)

</div>

