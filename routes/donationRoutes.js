const express = require('express');
const donationController = require('../controllers/donationController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(authController.protect, donationController.getAllDonations);

router.route('/getByDate').get(donationController.getDonationsByDay)

module.exports = router;
