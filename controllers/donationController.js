const Donation = require('../model/donationModel');
const catchAsync = require('../utils/catchAsync');

exports.getAllDonations = catchAsync(async (req, res, next) => {
  const donations = await Donation.find();
  res.status(200).json({
    status: 'success',
    data: {
      donations,
    },
  });
});

exports.getDonationsByDay = catchAsync(async (req, res, next) => {
  const stats = await Donation.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        numDonations: { $sum: 1 },
        sumAmountDonated: { $sum: '$donated_amount' },
        avgAmountDonated: { $avg: '$donated_amount' },
        minAmountDonated: { $min: '$donated_amount' },
        maxAmountDonated: { $max: '$donated_amount' },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});
