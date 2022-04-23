const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = mongoose.Schema([
  {
    name: {
      type: String,
      required: [true, 'Please provide your name!'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
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
    photo: String,
    donations: [
      {
        campaign_name: String,
        donated_amount: Number,
        donated_at: Date,
      },
    ],
    role: {
      type: String,
      enum: ['donar', 'fundraiser', 'admin'],
      default: 'donar',
    },
    password: {
      type: String,
      required: [true, 'Please provide a pasword.'],
      minLength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please cofirm your password.'],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: 'please confirm a correct password.',
      },
    },
    address: {
      type: String,
      trim: true,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type : Date,
      default: Date.now()
    },
    expiresAt: Date,
    otp: String,
    verified: {
      type: Boolean,
      default: false,
    },
  },
]);

userSchema.methods.comparePassword = async function (
  givenPassword,
  originalPassword
) {
  return await bcrypt.compare(givenPassword, originalPassword);
};

userSchema.pre('save', async function (next) {
  //0)CONDITION ONLY RUN IF PASSWORD WAS ACTUALLY CHANGED
  if (!this.isModified('password')) return next();

  //1)ENCRYPTING THE PASSWORD
  this.password = await bcrypt.hash(this.password, 12);

  //2)DELETE THE PASSWORD CONFIRM FIELD
  this.passwordConfirm = undefined;
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
