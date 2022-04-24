//1) THIRD PARTY MODULES
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');

//2) CUSTOM MODULES
const campaignRouter = require('./routes/campaignRoutes');
const usersRouter = require('./routes/userRoutes');
const donationRouter = require('./routes/donationRoutes');
const favoriteRouter = require('./routes/favoriteRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

//3) MIDDILEWARES

//CORS
const corsOptions = {
  origin: /fund-raiser\.netlify.app$/,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200, // for some legacy browsers
};
app.use(cors(corsOptions));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Limit requests from same API
// const limiter = rateLimit({
//   max: 1000,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this IP, please try again in an hour!',
// });
// app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

//3.1) ROUTER MIDDILEWARES
app.get('/', (req, res) => {
  res.send('HELLO TO FUNDRAISER API');
});
app.use('/api/v1/campaigns', campaignRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/donations', donationRouter);
app.use('/api/v1/favorites', favoriteRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`cannot find ${req.originalUrl} in this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
