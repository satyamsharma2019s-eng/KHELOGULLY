'use strict';

/**
 * Compute Z-score and percentile from a raw score.
 *
 * In production, the mean and stdDev would be computed from all existing
 * results for the same testType (stored aggregates). For MVP, we use
 * hardcoded per-testType baselines that can be updated as data accumulates.
 *
 * Z-score  = (rawScore - mean) / stdDev
 * Percentile = Φ(zScore) * 100  (CDF of standard normal distribution)
 *
 * @param {number} rawScore  - The athlete's raw score
 * @param {string} testType  - Test category (used to look up baseline stats)
 * @returns {{ zScore: number, percentile: number }}
 */
function computeZScoreAndPercentile(rawScore, testType) {
  // Baseline stats per test type (mean, stdDev). Extend as needed.
  const baselines = {
    speed_run:       { mean: 7.5,  stdDev: 1.2  },
    standing_jump:   { mean: 140,  stdDev: 25   },
    sit_ups:         { mean: 25,   stdDev: 8    },
    push_ups:        { mean: 20,   stdDev: 7    },
    shuttle_run:     { mean: 12.5, stdDev: 1.5  },
    flexibility:     { mean: 30,   stdDev: 10   },
    default:         { mean: 50,   stdDev: 15   },
  };

  const { mean, stdDev } = baselines[testType] || baselines.default;

  if (stdDev === 0) return { zScore: 0, percentile: 50 };

  const zScore = parseFloat(((rawScore - mean) / stdDev).toFixed(4));
  const percentile = parseFloat((normalCDF(zScore) * 100).toFixed(2));

  return { zScore, percentile };
}

/**
 * Standard normal CDF using the error function approximation (Hart, 1968).
 * Accurate to ~7 decimal places — sufficient for sports analytics.
 * @param {number} z
 * @returns {number} probability [0, 1]
 */
function normalCDF(z) {
  const t = 1 / (1 + 0.2315419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))));

  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;

  return z >= 0 ? cdf : 1 - cdf;
}

module.exports = { computeZScoreAndPercentile };
