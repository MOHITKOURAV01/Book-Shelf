import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from './app.js';
import { assertJwtConfig, ConfigError } from './config/jwt.js';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookshelf';

/**
 * Validate configuration before anything else happens.
 *
 * This runs before the Mongo connection on purpose. A bad JWT_SECRET is not
 * something to discover on the first login of the day — at that point the
 * process is already accepting traffic, and in the specific case of a missing
 * secret it would have been accepting traffic while signing sessions anyone
 * could forge. Refusing to start is the only safe answer, and the message has
 * to say what to do about it.
 */
try {
  assertJwtConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`Configuration error: ${error.message}`);
    process.exit(1);
  }
  throw error;
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });
