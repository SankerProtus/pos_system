import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { authRepository } from "../repositories/auth.repository.js";

// Configure Passport to use Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] && profile.emails[0].value;
        const name = profile.displayName || "Guest";

        if (!email) {
          return done(new Error("No email found in Google profile"), null);
        }

        const user = await authRepository.findUserByEmail(email);
        if (!user) {
          // OAuth users don't have passwords - use a random unguessable hash
          const randomHash = `google_oauth_${Date.now()}_${Math.random().toString(36)}`;

          const newUser = await authRepository.createUser({
            name,
            email,
            passwordHash: randomHash, // Placeholder
            role: "CASHIER",
            isActive: true,
            isVerified: true,
          });
          done(null, newUser);
        } else {
          done(null, user);
        }
      } catch (error) {
        done(error, null);
      }
    },
  ),
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await authRepository.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
