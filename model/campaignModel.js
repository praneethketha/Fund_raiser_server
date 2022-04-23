const mongoose = require('mongoose');
const filterToSelect = require('../utils/filterToSelect');
const User = require('./userModel');

const campaignSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'a campaign must have a name'],
    unique: true,
    trim: true,
  },
  email: String,
  details: {
    type: String,
    trim: true,
    required: [true, 'a campaign must have a description'],
  },
  category: {
    type: String,
    required: [true, 'a campaign must have a category'],
    enum: {
      values: ['emergency', 'animals', 'orphanages', 'education', 'others'],
      message: `category must be one of given values`,
    },
  },
  target_amount: {
    type: Number,
    required: [true, 'a campaign must have a specific fund'],
  },
  collected_amount: {
    type: Number,
    default: 0000,
  },
  cover_pic: {
    type: String,
    required: [true, 'a campaign must have a cover image'],
  },
  certificates: [String],
  contact_number: {
    type: Number,
    match: /^[0-9]{10}/,
    required: [true, 'a campaign must have a contact number'],
    validate: {
      validator: function (val) {
        const reg = /\+?\d[\d -]{8,12}\d/;
        return reg.test(val);
      },
      message: 'please enter valid mobile number',
    },
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'],
    },
    coordinates: [Number],
    address: {
      type: String,
      required: [true, 'a campaign must have a address'],
      trim: true,
    },
    description: String,
  },
  created_by: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  total_donations:{
    type: Number,
    default: 0,
  },
  state: {
    type: String,
    required: [true, 'a campaign must have a state'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

campaignSchema.pre(/^find/, function (next) {
  // populating user with id
  this.populate({
    path: 'created_by',
    select: filterToSelect(User.schema.paths, 'name', 'email', '_id'),
  });

  next();
});

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
