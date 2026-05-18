const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token
 * @param {String} token - Google ID token
 * @returns {Object} User info from Google
 */
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    return {
      google_id: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      full_name: payload.name,
      avatar_url: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    throw new Error('Invalid Google token');
  }
};

module.exports = {
  verifyGoogleToken
};
