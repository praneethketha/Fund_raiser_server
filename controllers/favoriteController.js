const Favorite = require('./../model/fovoriteModel');
const catchAsync = require('../utils/catchAsync');

exports.getAllFavorites = catchAsync(async (req, res, next) => {
  const favorites = await Favorite.find();
  res.status(200).json({
    status: 'success',
    data: {
      favorites,
    },
  });
});

exports.AddToFavorite = catchAsync(async (req, res, next) => {
  const newFavorite = await Favorite.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      favorite: newFavorite,
    },
  });
});

exports.deleteFromFavorites = catchAsync(async (req, res, next) => {
  const favorite = await Favorite.findByIdAndDelete(req.params.id);

  if (!favorite) {
    return next(new AppError('no campaign found with that ID.', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getFavoritesByUser = catchAsync(async (req, res, next) => {
  const favorites = await Favorite.find({ user: req.params.id });

  res.status(200).json({
    status: 'success',
    data: {
      favorites,
    },
  });
});
