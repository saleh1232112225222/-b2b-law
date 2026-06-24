const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'slaehmap@gmail.com',
      pass: 'kkod vuiv zvgu izux'
    }
});
transporter.sendMail({
    from: '"B2B Lawyer" <slaehmap@gmail.com>',
    to: 'slaehmap@gmail.com',
    subject: 'Test Email',
    text: 'If you receive this, SMTP is working!'
}).then(info => {
    console.log('Success:', info.response);
}).catch(err => {
    console.error('Error:', err);
});
