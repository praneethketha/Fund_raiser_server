const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');

const sendEmail = async (options) => {
  // 1) Create a transporter
  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  transporter.use(
    'compile',
    hbs({
      viewEngine: {
        extname: '.handlebars',
        partialsDir: `${__dirname}/../views/`,
        defaultLayout: false,
      },
      viewPath: `${__dirname}/../views/`,
      extName: '.handlebars',
    })
  );

  // 2) Define the email options
  let mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: options.email,
    subject: options.subject,
    text: options.message || '',
    template: 'mail_template',
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
