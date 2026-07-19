import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Schema defining structural attributes, validation constraints, and options.
 */
export const userSchema = new mongoose.Schema(
  {
    /**
     * The full name of the user.
     * Must be between 2 and 50 characters and will be trimmed.
     */
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minLength: [2, 'Name must be at least 2 characters long'],
      maxLength: [50, 'Name cannot exceed 50 characters'],
    },
    /**
     * The unique email address used for user authentication and communication.
     * Saved in lowercase, trimmed, and validated against standard email format pattern.
     */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address! Email must be a valid email address.`,
      },
    },
    /**
     * The hashed password used to authenticate the user securely.
     * Minimum length of 6 characters required before hashing.
     */
    password: {
      type: String,
      required: [true, 'Password is required'],
      minLength: [6, 'Password must be at least 6 characters long'],
    },
    /**
     * The access role determining authorization permissions.
     * Constrained to either 'admin' or 'user'.
     */
    role: {
      type: String,
      enum: {
        values: ['admin', 'user'],
        message: 'Role must be either admin or user. {VALUE} is invalid.',
      },
      default: 'user',
    },
    /**
     * Flag indicating whether the user's account is active.
     * Inactive accounts are restricted from accessing system resources.
     */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash passwords automatically before insertion/modification
// Note: Mongoose 9+ async pre-hooks do not receive `next` — use return/throw instead
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare plain-text passwords against bcrypt hashes
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Override toJSON() instance method to exclude the hashed password in server outputs
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

/**
 * Mongoose model compiled from the userSchema.
 */
export const User = mongoose.model('User', userSchema);

export default User;
