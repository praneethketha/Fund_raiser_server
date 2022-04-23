const express = require('express');
const favoriteController = require('../controllers/favoriteController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get( favoriteController.getAllFavorites)
  .post(authController.protect, favoriteController.AddToFavorite);

router
  .route('/:id')
  .get(favoriteController.getFavoritesByUser)
  .delete(authController.protect, favoriteController.deleteFromFavorites);

module.exports = router;
