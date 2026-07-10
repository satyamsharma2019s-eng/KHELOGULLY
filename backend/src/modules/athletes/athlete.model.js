'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Athlete model — PRD §7
 *
 * PII fields: guardianName, village, district — NEVER logged, excluded from
 * application logs per PRD §6.2 and §9 (minors' data protection).
 */
const athleteSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Athlete name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [5, 'Age must be at least 5'],
      max: [25, 'Age must be at most 25'],
    },

    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female, or other',
      },
    },

    // PII — never log these fields
    guardianName: {
      type: String,
      trim: true,
      default: null,
    },

    village: {
      type: String,
      trim: true,
      default: null,
    },

    district: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * For student-role users: links their login account to this Athlete profile.
     * Null for scouts' manually-registered athletes.
     */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    /**
     * Reference to the scout/PET who registered this athlete.
     * Used for ownership scoping — scouts can only access athletes they registered.
     */
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'registeredBy is required'],
      index: true,
    },

    /**
     * School or region of the registering scout — denormalized for fast dashboard queries.
     */
    schoolOrRegion: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    // Soft delete (PRD §6.2)
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Do not strip PII here — we need it for legitimate views.
        // Logging redaction is handled in logger.js via REDACTED_KEYS set.
        return ret;
      },
    },
  }
);

// Compound index for dashboard queries (role-scoped list)
athleteSchema.index({ schoolOrRegion: 1, district: 1, isDeleted: 1 });
athleteSchema.index({ registeredBy: 1, isDeleted: 1 });

const Athlete = mongoose.model('Athlete', athleteSchema);
module.exports = Athlete;
