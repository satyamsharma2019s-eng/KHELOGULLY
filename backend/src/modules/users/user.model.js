'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * User model — stores scouts, admins, and PETs (parent/educator/trainer).
 *
 * PRD §7 fields:
 *  name, phone, role, passwordHash, refreshTokenHash, schoolOrRegion
 *
 * Extended with:
 *  - refreshTokenHashes[]  — array to support multiple devices per user
 *  - loginAttempts + lockUntil — account lockout (5 failures → 15 min)
 */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+?[0-9]{7,15}$/, 'Invalid phone number format'],
    },

    role: {
      type: String,
      enum: {
        values: ['pet', 'scout', 'admin', 'student', 'teacher'],
        message: 'Role must be pet, scout, admin, student, or teacher',
      },
      default: 'pet',
    },

    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never returned in queries by default
    },

    /**
     * Array of bcrypt-hashed refresh tokens — one entry per active device session.
     * On logout, the matching hash is removed.
     * On reuse-detection (breach signal), ALL hashes are cleared (all sessions revoked).
     */
    refreshTokenHashes: {
      type: [String],
      default: [],
      select: false,
    },

    /**
     * Used for role-based data scoping: scouts see only athletes from their schoolOrRegion.
     * Required for scout role; optional for admin (admin sees all).
     */
    schoolOrRegion: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * For students only — reference to their auto-created Athlete profile.
     * Null for all other roles.
     */
    studentProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      default: null,
    },

    // Account lockout (PRD §6.1)
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
      index: { expires: 0 }, // TTL-style — Mongoose will NOT auto-delete; we use date comparison
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    // Never return passwordHash or refreshTokenHashes in toJSON
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokenHashes;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);

// Compound index for scout dashboard scoping
userSchema.index({ role: 1, schoolOrRegion: 1 });

/**
 * Virtual — check if account is currently locked.
 * @returns {boolean}
 */
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

const User = mongoose.model('User', userSchema);
module.exports = User;
