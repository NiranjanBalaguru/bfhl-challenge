'use strict';

const express = require('express');
const cors = require('cors');
const { process: processData } = require('./processor');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Identity (fill in your details here) ─────────────────────────────────────
const IDENTITY = {
  user_id: process.env.USER_ID || 'niranjanBalaguru_22012006',
  email_id: process.env.EMAIL_ID || 'nb1999@srmist.edu.in',
  college_roll_number: process.env.ROLL_NUMBER || 'RA2311003010050',
};

// ── POST /bfhl ────────────────────────────────────────────────────────────────
app.post('/', (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '"data" must be an array of strings.' });
    }

    const result = processData(data);

    return res.status(200).json({
      user_id: IDENTITY.user_id,
      email_id: IDENTITY.email_id,
      college_roll_number: IDENTITY.college_roll_number,
      ...result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/bfhl', (req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BFHL API running on port ${PORT}`));

module.exports = app;
