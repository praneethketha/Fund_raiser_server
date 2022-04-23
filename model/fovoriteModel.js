const mongoose = require('mongoose');
const filterToSelect = require('../utils/filterToSelect');
const Campaign = require('./campaignModel');
const User = require('./userModel');

const favoriteSchema = mongoose.Schema([
  {
    campaign: {
      type: mongoose.Schema.ObjectId,
      ref: 'Campaign',
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    favorite:{
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
]);

favoriteSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'campaign',
    select: filterToSelect(Campaign.schema.paths, 'name', '_id'),
  }).populate({
    path: 'user',
    select: filterToSelect(User.schema.paths, 'name', 'email', '_id'),
  });
  next();
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
