const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");

const sendMail = async (email, subject, htmlcontent) => {
  try {
    const transporter = await nodemailer.createTransport(
      smtpTransport({
        host: process.env.MAIL_CONFIG_HOST, //mail.example.com (your server smtp)
        port: process.env.MAIL_CONFIG_PORT, //2525 (specific port)
        auth: {
          user: process.env.MAIL_CONFIG_USER, //user@mydomain.com
          pass: process.env.MAIL_CONFIG_PWD, //password from specific user mail
        },
        secure: false,
        tls: {
          rejectUnauthorized: false,
        },
        debug: true,
      }),
    );
    const mailOptions = {
      from: process.env.MAIL_CONFIG_USER,
      to: email,
      subject: subject,
      html: htmlcontent,
    };
    const sendMail = await transporter.sendMail(mailOptions);
    transporter.close();
    return sendMail;
  } catch (error) {
    console.log("error==========", error);
    return error;
  }
};

module.exports = {
  sendMail,
};
