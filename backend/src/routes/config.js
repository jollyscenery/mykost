const express = require('express');
const router = express.Router();
const { PLATFORM_COMMISSION_RATE } = require('../utils/commission');

router.get('/commission-rate', (req, res) => {
  res.json({
    rate: PLATFORM_COMMISSION_RATE,
    percent: `${Math.round(PLATFORM_COMMISSION_RATE * 100)}%`,
  });
});

module.exports = router;
