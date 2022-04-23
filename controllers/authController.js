const { promisify } = require('util');
const User = require('./../model/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

//Generating the JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

///setting the JWT as a cookie
const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

//SIGNUP CONTROLLER
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    address: req.body.address,
    contact_number: req.body.contact_number,
    photo: req.body.photo,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  sendOTPVerificationMail(newUser, res, next);
});

//LOGIN CONTROLLER
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) Check if email and password are exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //2) Check if users exists and password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3 Checking whether the user is active
  if (!user.active) {
    return next(
      new AppError('User you are trying to log in is deactivated.', 401)
    );
  }

  //4) If everything ok, send token to client
  createSendToken(user, 200, res);
});

//PROTECT ROUTES CONTROLLER
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    );
  }

  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token does no longer exist', 401)
    );
  }

  //4) Check if user changed password after the token generated
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again', 401)
    );
  }

  req.user = currentUser;
  next();
});

//AUTHORIZATION CONTROLLER
exports.restrictTo = (...role) => {
  return (req, res, next) => {
    if (!role.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action!', 403)
      );
    }
    next();
  };
};

//FORGOT PASSWORD CONTROLLER
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get use based on POSTed email
  if (!req.body.email) {
    return next(new AppError('Please provid email address!', 404));
  }
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address!', 404));
  }
  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) Send it to user's email
  const message = `<p> Dear ${user.name}, <br /> <br /> <p>&emsp; We received a request to reset your password for your Fund Raiser account: ${user.email}. Please click below linkt to reset your password. It will work only for 10 mintues.</p> <br /><a class="reset-password" href="https://fund-raiser.netlify.app/resetPassword/${resetToken}">Reset password</a><br /> <p>If you did not request to reset your password, please ignore this message.</p> <br /><p>Thank you,</p> <p>Fund Raiser Team.</p>`;

  //3A) Reading template from the views
  let template = fs.readFileSync(
    `${__dirname}/../views/mail_template.handlebars`,
    'utf-8'
  );

  const original_template = template;
  template = template.replace(/{%MESSAGE%}/g, message);

  //3B) Writing into the template file
  fs.writeFileSync(
    `${__dirname}/../views/mail_template.handlebars`,
    template,
    'utf-8'
  );

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token',
    });

    //Finally, writing the original file again
    fs.writeFile(
      `${__dirname}/../views/mail_template.handlebars`,
      original_template,
      'utf-8',
      () => {
        console.log('completed writing back...');
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending th email. Please try agian later',
        500
      )
    );
  }
});

//RESET PASSWORD CONTROLLER
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

//UPDATE PASSWORD CONTROLLER
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.comparePassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

//SEND OTP VERIFICATION MAIL
const sendOTPVerificationMail = catchAsync(async (user, res, next) => {
  const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
  const hashedOTP = await bcrypt.hash(otp, 10);
  user.otp = hashedOTP;
  user.createdAt = Date.now();
  user.expiresAt = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  //3) Send it to user's email
  const message = `<p> Dear ${user.name}, <br /> <br /> <p>&emsp; We received a request to verify your email for your Fund Raiser account: ${user.email}. Here is your One Time Password(OTP) <b class="otp">${otp}</b>. It will work only for 10 mintues.</p> <br /><br /> <p>If you did not request to reset your password, please ignore this message.</p> <br /> <p>Thank you,</p> <p>Fund Raiser Team.</p>`;

  //3A) Reading template from the views
  let template = fs.readFileSync(
    `${__dirname}/../views/mail_template.handlebars`,
    'utf-8'
  );

  const original_template = template;
  template = template.replace(/{%MESSAGE%}/g, message);

  //3B) Writing into the template file
  fs.writeFileSync(
    `${__dirname}/../views/mail_template.handlebars`,
    template,
    'utf-8'
  );
  try {
    await sendEmail({
      email: user.email,
      subject: 'Verify your email',
    });

    //Finally, writing the original file again
    fs.writeFile(
      `${__dirname}/../views/mail_template.handlebars`,
      original_template,
      'utf-8',
      () => {
        console.log('completed writing back...');
      }
    );

    return res.status(200).json({
      status: 'pending',
      message: 'verification otp email sent',
      data: {
        userId: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    user.otp = undefined;
    user.createdAt = undefined;
    user.expiresAt = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending th email. Please try agian later',
        500
      )
    );
  }
});

//VERIFY OTP CONTROLLER
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { user_id, otp } = req.body;

  //1) If user_id and otp are required
  if ((!user_id, !otp)) {
    return next(new AppError('please enter otp', 404));
  }

  const user = await User.findById(user_id);
  //2) Checking whether the user exists
  if (!user) {
    return next(new AppError('User with given id deos not exists.', 404));
  }

  const validOTP = await bcrypt.compare(otp, user.otp);
  const expiresAt = user.expiresAt;
  //3) Validating OTP and Checking whether the otp expired
  if (!validOTP || expiresAt < Date.now()) {
    return next(new AppError('Invalid OTP or otp has been expired!', 404));
  }

  //4) Saving the user by updating the fields
  user.otp = undefined;
  user.expiresAt = undefined;
  user.createdAt = undefined;
  user.verified = true;

  await user.save({ validateBeforeSave: false });

  //5) Sending the user the JWT token.
  createSendToken(user, 200, res);
});
