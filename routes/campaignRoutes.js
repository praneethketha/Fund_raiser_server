const express = require('express');
const campaignController = require('./../controllers/campaignController');
const authController = require('./../controllers/authController');

const router = express.Router();

// router.param('id', checkId);

router
  .route('/donate')
  .patch(authController.protect, campaignController.donateToCampaign);

router
  .route('/')
  .get(campaignController.getAllCampaigns)
  .post(
    authController.protect,
    authController.restrictTo('fundraiser', 'admin'),
    campaignController.createCampaign
  );

router.route('/stats').get(campaignController.getCampaignStats);
router.route('/byCategory').get(campaignController.getByCategory);
router
  .route('/:id')
  .get(campaignController.getCampaign)
  .patch(authController.protect, campaignController.updateCampaign)
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    campaignController.deleteCampaign
  );

module.exports = router;
