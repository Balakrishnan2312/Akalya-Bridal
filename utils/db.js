const mongoose = require('mongoose');

// Disable Mongoose command buffering globally so operations fail immediately if DB is offline
mongoose.set('bufferCommands', false);

const getMongoUri = () => {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/akalya_bridal';
};

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

let connectionPromise = null;

const connectDB = async () => {
  if (isDbConnected()) {
    return true;
  }

  if (mongoose.connection.readyState === 2 && connectionPromise) {
    try {
      await connectionPromise;
      return isDbConnected();
    } catch (e) {
      return false;
    }
  }

  console.log('MongoDB connecting...');
  const uri = getMongoUri();

  try {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    await connectionPromise;
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    connectionPromise = null;
    return false;
  }
};

const ensureDbConnected = async () => {
  if (isDbConnected()) {
    return true;
  }

  if (mongoose.connection.readyState === 2) {
    // If currently connecting, wait up to 5s for connection state 1 or error
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(isDbConnected());
      }, 5000);

      const check = () => {
        if (isDbConnected()) {
          clearTimeout(timer);
          resolve(true);
        } else if (mongoose.connection.readyState === 0) {
          clearTimeout(timer);
          resolve(false);
        }
      };

      mongoose.connection.once('connected', () => { clearTimeout(timer); resolve(true); });
      mongoose.connection.once('error', () => { clearTimeout(timer); resolve(false); });
    });
  }

  return await connectDB();
};

module.exports = {
  connectDB,
  isDbConnected,
  ensureDbConnected,
  getMongoUri
};
