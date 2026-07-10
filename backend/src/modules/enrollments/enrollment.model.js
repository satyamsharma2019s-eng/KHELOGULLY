'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Enrollment model — tracks a Student's membership in a school/program.
 *
 * Key design decisions:
 * - Unique compound index { studentId, schoolOrRegion } → one active enrollment per school per student.
 * - A student CAN have enrollments in multiple schools (multiple records, different schoolOrRegion).
 * - teacherId is optional — assigned if the student is linked to a specific teacher's class.
 * - Soft-close via status field; completedAt records when status → 'completed'/'inactive'.
 */
const enrollmentSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'studentId is required'],
      index: true,
    },

    athleteId: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      required: [true, 'athleteId is required'],
      index: true,
    },

    schoolOrRegion: {
      type: String,
      required: [true, 'schoolOrRegion is required'],
      trim: true,
      index: true,
    },

    /**
     * Optional — link to a specific teacher (role:'teacher') in this school.
     * If absent, the student is enrolled in the school generically.
     */
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'completed'],
        message: 'Status must be active, inactive, or completed',
      },
      default: 'active',
      index: true,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One enrollment per school per student
enrollmentSchema.index({ studentId: 1, schoolOrRegion: 1 }, { unique: true });

// Teacher's active student list
enrollmentSchema.index({ teacherId: 1, status: 1 });

// School-wide enrollment queries
enrollmentSchema.index({ schoolOrRegion: 1, status: 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;
