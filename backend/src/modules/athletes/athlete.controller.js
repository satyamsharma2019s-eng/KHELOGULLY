'use strict';
const athleteService = require('./athlete.service');

async function createAthlete(req, res, next) {
  try {
    const athlete = await athleteService.createAthlete(req.body, req.user);
    return res.status(201).json({ success: true, data: { athlete } });
  } catch (err) {
    return next(err);
  }
}

async function listAthletes(req, res, next) {
  try {
    const { athletes, pagination } = await athleteService.listAthletes(req.query, req.user);
    return res.status(200).json({ success: true, data: athletes, pagination });
  } catch (err) {
    return next(err);
  }
}

async function getAthlete(req, res, next) {
  try {
    const athlete = await athleteService.getAthleteById(req.params.id, req.user);
    return res.status(200).json({ success: true, data: { athlete } });
  } catch (err) {
    return next(err);
  }
}

async function updateAthlete(req, res, next) {
  try {
    const athlete = await athleteService.updateAthlete(req.params.id, req.body, req.user);
    return res.status(200).json({ success: true, data: { athlete } });
  } catch (err) {
    return next(err);
  }
}

async function deleteAthlete(req, res, next) {
  try {
    await athleteService.deleteAthlete(req.params.id, req.user);
    return res.status(200).json({ success: true, data: { message: 'Athlete deleted successfully' } });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createAthlete, listAthletes, getAthlete, updateAthlete, deleteAthlete };
