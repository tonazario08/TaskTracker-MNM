const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const google_id = profile.id;
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const avatar_url = profile.photos[0].value;

        // Check if user exists by email
        let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (userResult.rows.length > 0) {
          user = userResult.rows[0];
          // If they exist but don't have google_id, update it
          if (!user.google_id) {
            await pool.query('UPDATE users SET google_id = $1, is_verified = TRUE, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3', [google_id, avatar_url, user.id]);
            user.google_id = google_id;
            user.is_verified = true;
          }
        } else {
          // Create new user
          userResult = await pool.query(
            'INSERT INTO users (name, email, google_id, avatar_url, is_verified) VALUES ($1, $2, $3, $4, TRUE) RETURNING *',
            [name, email, google_id, avatar_url]
          );
          user = userResult.rows[0];
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We won't strictly use serializeUser/deserializeUser for the final session because we are issuing a JWT.
// But passport needs them defined if we use session middleware.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
