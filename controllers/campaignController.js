const Donation = require('../model/donationModel');
const AppError = require('../utils/appError');
const Campaign = require('./../model/campaignModel');
const Favorite = require('./../model/fovoriteModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const User = require('./../model/userModel');

exports.getAllCampaigns = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Campaign.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const campaigns = await features.query;

  res.status(200).json({
    status: 'success',
    results: campaigns.length,
    data: {
      campaigns,
    },
  });
});

exports.createCampaign = catchAsync(async (req, res, next) => {
  const newCampaign = await Campaign.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      campaign: newCampaign,
    },
  });
});

exports.getCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return next(new AppError('no campaign found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      campaign,
    },
  });
});

exports.updateCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!campaign) {
    return next(new AppError('no campaign found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      campaign,
    },
  });
});

exports.deleteCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);
  
  if (!campaign) {
    return next(new AppError('no campaign found with that ID.', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getCampaignStats = catchAsync(async (req, res, next) => {
  const stats = await Campaign.aggregate([
    {
      $match: { target_amount: { $gte: 40000 } },
    },
    {
      $group: {
        _id: { $toUpper: '$category' },
        numCampaigns: { $sum: 1 },
        sumAmount: { $sum: '$target_amount' },
        avgTargetAmount: { $avg: '$target_amount' },
        avgCollectedAmount: { $avg: '$collected_amount' },
        minTargetAmount: { $min: '$target_amount' },
        maxTargetAmount: { $max: '$target_amount' },
      },
    },
    {
      $sort: { avgTargetAmount: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      results: stats.length,
      stats,
    },
  });
});

exports.donateToCampaign = catchAsync(async (req, res, next) => {
  //1) Checking whether the user id and campaign id exists
  if (!req.body.donated_amount || req.body.donated_amount === 0) {
    return next(new AppError('Please provide the donated amount!', 404));
  }

  const campaign = await Campaign.findById(req.body.campaign);
  const required_amount = campaign.target_amount - campaign.collected_amount;
  //2) Check if the donated amount is provided or not and collected amount is less than provided amount
  if (required_amount < req.body.donated_amount) {
    return next(
      new AppError(
        'Your are donating more amount, please donate correctly...',
        404
      )
    );
  }
  const user = await User.findById(req.body.user);

  //2B) Update the user model with the donations made
  await User.findByIdAndUpdate(req.body.user, {
    donations: [
      ...user.donations,
      {
        campaign_name: campaign.name,
        donated_amount: req.body.donated_amount,
        donated_at: Date.now(),
      },
    ],
  });

  //3) Post the information to the donation schema
  const donation = await Donation.create(req.body);
  //4) Update the information of campaign
  const updated_campaign = await Campaign.findByIdAndUpdate(
    req.body.campaign,
    {
      collected_amount: campaign.collected_amount + donation.donated_amount,
      total_donations: campaign.total_donations + 1 
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      campaign: updated_campaign,
      donation,
    },
  });
});

exports.getByCategory = catchAsync(async (req, res, next) => {
  const stats = await Campaign.aggregate([
    {
      $project: {
        _id: 1,
        name: 1,
        details: 1,
        category: 1,
        target_amount: 1,
        collected_amount: 1,
        cover_pic: 1,
        contact_number: 1,
        location: 1,
        created_by: 1,
        state: 1,
      },
    },
    {
      $group: {
        _id: { $toUpper: '$category' },
        numCampaigns: { $sum: 1 },
        sumAmount: { $sum: '$target_amount' },
        avgTargetAmount: { $avg: '$target_amount' },
        avgCollectedAmount: { $avg: '$collected_amount' },
        minTargetAmount: { $min: '$target_amount' },
        maxTargetAmount: { $max: '$target_amount' },
      },
    },
    {
      $sort: { avgTargetAmount: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      results: stats.length,
      stats,
    },
  });
});
