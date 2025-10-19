const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');

// GET all brands
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// POST create a new brand
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Brand name is required' });
    const brand = new Brand({ name });
    await brand.save();
    res.status(201).json(brand);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

module.exports = router;
