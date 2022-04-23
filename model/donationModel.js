const mongoose = require('mongoose');
const filterToSelect = require('../utils/filterToSelect');
const Campaign = require('./campaignModel');
const User = require('./userModel');

const donationSchema = mongoose.Schema([
  {
    campaign: {
      type: mongoose.Schema.ObjectId,
      ref: 'Campaign',
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    donated_amount: {
      type: Number,
      required: true,
    },
    comments:String,
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
]);

donationSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'campaign',
    select: filterToSelect(Campaign.schema.paths, 'name', '_id', 'category', 'target_amount', 'collected_amount'),
  }).populate({
    path: 'user',
    select: filterToSelect(User.schema.paths, 'name', 'email', '_id'),
  });
  next();
});

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;
