import mongoose from 'mongoose';

/**
 * Lead Schema defining lead structure, enums, validators, and indexing setup.
 */
export const leadSchema = new mongoose.Schema(
  {
    /**
     * The full name of the lead contact person.
     * Must be between 2 and 100 characters, trimmed.
     */
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      minLength: [2, 'Lead name must be at least 2 characters long'],
      maxLength: [100, 'Lead name cannot exceed 100 characters'],
    },
    /**
     * The company or organization representing the lead.
     * Required and trimmed.
     */
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    /**
     * The primary email address of the lead contact.
     * Required, lowercase, trimmed, validated against email format regex.
     */
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address! Email must be a valid email address.`,
      },
    },
    /**
     * The telephone contact number of the lead.
     * Optional field.
     */
    phone: {
      type: String,
      trim: true,
    },
    /**
     * The current status mapping to the lead workflow lifecycle stage.
     * Must correspond to one of the defined status categories.
     */
    status: {
      type: String,
      enum: {
        values: ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'],
        message: '{VALUE} is not a valid lead status. Allowed values are: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost.',
      },
      default: 'New',
      required: [true, 'Lead status is required'],
    },
    /**
     * The channel or marketing source from which the lead originated.
     * Must correspond to one of the defined source channels.
     */
    source: {
      type: String,
      enum: {
        values: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'],
        message: '{VALUE} is not a valid lead source. Allowed values are: Website, Referral, LinkedIn, Cold Call, Email Campaign, Other.',
      },
      default: 'Website',
      required: [true, 'Lead source is required'],
    },
    /**
     * Additional notes or descriptions logging customer interactions.
     * Optional, with a max length of 1000 characters.
     */
    notes: {
      type: String,
      maxLength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    /**
     * Reference to the User ID who owns or acts as the sales representative for this lead.
     * Required field.
     */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lead owner reference (User ID) is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field: Calculates number of days since the lead was created
leadSchema.virtual('age').get(function () {
  if (!this.createdAt) return 0;
  const diffTime = Date.now() - this.createdAt.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Compound index on (owner, status) for optimized queries
leadSchema.index({ owner: 1, status: 1 });

// Compound index on (owner, source) for optimized filtering
leadSchema.index({ owner: 1, source: 1 });

// Compound index on (owner, createdAt) for date range queries and sorting
leadSchema.index({ owner: 1, createdAt: -1 });

// Single index on email for quick lookup validation
leadSchema.index({ email: 1 });

/**
 * Mongoose model compiled from the leadSchema.
 */
export const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
