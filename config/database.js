import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure env variables are configured
dotenv.config();

/**
 * Connect to MongoDB Atlas database.
 * Sets up connection listener and parameters.
 * Logs target cluster host on connection success.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    // Exit application process with failure status code
    process.exit(1);
  }
};

export default connectDB;
