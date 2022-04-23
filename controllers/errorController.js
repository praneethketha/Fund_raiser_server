const AppError = require('../utils/appError');

//Handles casterror in DB
const handleCastDB = (err) => {
  message = `Invalid ${err.path} : ${err.value}!`;
  return new AppError(message, 400);
};

//Handles Duplicate fields error in DB
const handleDuplicateFields = (err) => {
  const key = Object.keys(err.keyValue);
  message = `Duplicate KEY:${key}. Please use different value.`;
  return new AppError(message, 400);
};

//Handles validation errors in DB
const handleValidationDB = (err) => {
  message = {};
  for (const [key, value] of Object.entries(err.errors)) {
    if (key.includes('.')) {
      message[`${key.split('.')[1]}`] = value.message;
    } else {
      message[`${key}`] = value.message;
    }
  }
  message = JSON.stringify(message);
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has been expired. Please log in again!', 401);

//1)SENDING ERRORS IN DEVELOPMENT ENV
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    err: err,
    message: err.message,
    stack: err.stack,
  });
};

//1)SENDING ERRORS IN PRODUCTION ENV
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'something went really wrong!!!',
    });
  }
};

//GLOBAL ERROR HANDLING MIDDILEWARE
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;
    if (error.name === 'CastError') error = handleCastDB(error);
    if (error.code === 11000) error = handleDuplicateFields(error);
    if (error.name === 'ValidationError') error = handleValidationDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, res);
  }
  next();
};
