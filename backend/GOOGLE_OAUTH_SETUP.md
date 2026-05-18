# Google OAuth Setup Guide

## 📋 Prerequisites

- Google Account
- Google Cloud Console access

## 🔧 Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `Motorcycle Repair Booking`
4. Click "Create"

### 2. Enable Google+ API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click "Create"

**Fill in the required information:**

- **App name**: `Motorcycle Repair Booking`
- **User support email**: Your email
- **App logo**: (Optional) Upload your app logo
- **Application home page**: `http://localhost:3000`
- **Authorized domains**: `localhost` (for development)
- **Developer contact information**: Your email

4. Click "Save and Continue"

**Scopes:**
- Add the following scopes:
  - `userinfo.email`
  - `userinfo.profile`
  - `openid`

5. Click "Save and Continue"

**Test users** (for development):
- Add your test email addresses
- Click "Save and Continue"

6. Review and click "Back to Dashboard"

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Select **Application type**: `Web application`

**Configure:**

- **Name**: `Motorcycle Repair Booking Web Client`

- **Authorized JavaScript origins**:
  ```
  http://localhost:3000
  http://localhost:5000
  ```

- **Authorized redirect URIs**:
  ```
  http://localhost:3000/auth/google/callback
  http://localhost:5000/api/auth/google/callback
  ```

4. Click "Create"

### 5. Get Your Credentials

After creation, you'll see a modal with:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `xxxxx`

**Copy these values!**

### 6. Update Backend .env File

Open `backend/.env` and update:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

### 7. Frontend Integration (React Example)

Install Google OAuth library:

```bash
npm install @react-oauth/google
```

**Wrap your app with GoogleOAuthProvider:**

```jsx
// src/index.js or src/App.js
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      {/* Your app components */}
    </GoogleOAuthProvider>
  );
}
```

**Create Google Login Button:**

```jsx
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

function LoginPage() {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/google', {
        id_token: credentialResponse.credential
      });

      const { tokens, user } = response.data.data;
      
      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Google login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
    alert('Login failed. Please try again.');
  };

  return (
    <div>
      <h1>Login</h1>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        useOneTap
        theme="filled_blue"
        size="large"
        text="signin_with"
        shape="rectangular"
      />
    </div>
  );
}
```

## 🧪 Testing

### Test with Postman

1. Get Google ID Token:
   - Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
   - Select "Google OAuth2 API v2" → `userinfo.email` and `userinfo.profile`
   - Click "Authorize APIs"
   - Click "Exchange authorization code for tokens"
   - Copy the `id_token`

2. Test API:
```bash
POST http://localhost:5000/api/auth/google
Content-Type: application/json

{
  "id_token": "your_google_id_token_here"
}
```

### Test with Frontend

1. Start backend: `npm run dev`
2. Start frontend: `npm start`
3. Click "Sign in with Google"
4. Select your Google account
5. Check if you're redirected to dashboard

## 🔒 Security Notes

### For Production:

1. **Update Authorized Origins:**
   ```
   https://yourdomain.com
   https://api.yourdomain.com
   ```

2. **Update Redirect URIs:**
   ```
   https://yourdomain.com/auth/google/callback
   https://api.yourdomain.com/api/auth/google/callback
   ```

3. **Change OAuth Consent Screen to "In Production"**

4. **Add Privacy Policy and Terms of Service URLs**

5. **Verify your domain ownership**

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"
- Check that your redirect URI in Google Console matches exactly
- Include protocol (http/https)
- No trailing slashes

### Error: "invalid_client"
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
- Restart your backend server after changing .env

### Error: "access_denied"
- User cancelled the login
- Check OAuth consent screen configuration

### Token Verification Failed
- Check that Google+ API is enabled
- Verify CLIENT_ID matches the one in frontend

## 📚 Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Websites](https://developers.google.com/identity/sign-in/web)
- [@react-oauth/google Documentation](https://www.npmjs.com/package/@react-oauth/google)

## ✅ Checklist

- [ ] Google Cloud Project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Client ID and Secret added to .env
- [ ] Backend server restarted
- [ ] Frontend library installed
- [ ] GoogleOAuthProvider configured
- [ ] Login button implemented
- [ ] Tested successfully

---

**Need help?** Check the [Google OAuth Troubleshooting Guide](https://developers.google.com/identity/sign-in/web/troubleshooting)
