'use strict';
const dashboardService = require('./dashboard.service');

async function getLeaderboard(req, res, next) {
  try {
    const data = await dashboardService.getLeaderboard(req.query, req.user);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const data = await dashboardService.getStats(req.user);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getDashboardAthletes(req, res, next) {
  try {
    const { athletes, pagination } = await dashboardService.getDashboardAthletes(req.query, req.user);
    return res.status(200).json({ success: true, data: athletes, pagination });
  } catch (err) {
    return next(err);
  }
}

async function getHeatmap(req, res, next) {
  try {
    const data = await dashboardService.getHeatmap(req.query, req.user);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getLeaderboard, getStats, getDashboardAthletes, getHeatmap };
