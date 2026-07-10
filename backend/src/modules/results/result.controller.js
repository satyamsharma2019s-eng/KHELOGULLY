'use strict';
const resultService = require('./result.service');

async function createResult(req, res, next) {
  try {
    const result = await resultService.createResult(req.body, req.user);
    return res.status(201).json({ success: true, data: { result } });
  } catch (err) {
    return next(err);
  }
}

async function listResults(req, res, next) {
  try {
    const { results, pagination } = await resultService.listResults(req.query, req.user);
    return res.status(200).json({ success: true, data: results, pagination });
  } catch (err) {
    return next(err);
  }
}

async function getResult(req, res, next) {
  try {
    const result = await resultService.getResultById(req.params.id, req.user);
    return res.status(200).json({ success: true, data: { result } });
  } catch (err) {
    return next(err);
  }
}

async function getResultScore(req, res, next) {
  try {
    const score = await resultService.getResultScore(req.params.id, req.user);
    return res.status(200).json({ success: true, data: { score } });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createResult, listResults, getResult, getResultScore };
