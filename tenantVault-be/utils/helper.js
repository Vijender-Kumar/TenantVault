'use strict';
const fs = require('fs');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
//const uniqueString = require('unique-string');
const fetch = require('node-fetch');
const path = require('path');
let moment = require('moment');
const axios = require('axios');
//const sgMail = require("@sendgrid/mail");
const PDFDocument = require('pdfkit');
const pdf2base64 = require('pdf-to-base64');
const {check,validationResult} = require('express-validator')
const jwt = require('jsonwebtoken');
const s3bucket = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const bCrypt = require('bcryptjs');

const uploadXmlDataToS3Bucket = (
  companyCode,
  retype,
  item,
  serviceName,
  callback,
) => {
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: `${companyCode ? companyCode : 'ARTM'
      }/services/${companyCode}/${serviceName}/${Date.now()}/${retype}.txt`,
    Body: JSON.stringify(item),
    ACL: 'public-read',
  };
  s3bucket.upload(params, function (err, uploadedFile) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, uploadedFile);
    }
  });
};

const validateTemplateFormat = async (templates) => {
  try {
    const errorTemplates = {};
    Object.keys(templates).forEach((template, index) => {
      errorTemplates[template] = templates[template].filter((item) => {
        return (
          !item.isCommon ||
          !item.field ||
          !item.title ||
          !item.type ||
          !item.validationmsg ||
          !item.isOptional ||
          !item.checked
        );
      });
    });
    return errorTemplates;
  } catch (error) {
    return error;
  }
};

const validateDataSync = (type, value) => {
  switch (type) {
    case 'name': {
      const name = /^[a-zA-Z]{1,50}$/;
      return name.test(value);
      break;
    }
    case 'fullname': {
      const name = /^[a-zA-Z ]{1,150}$/;
      return name.test(value);
      break;
    }
    case 'title': {
      const name = /^[A-Za-z0-9-@*#._+ ]{1,50}$/;
      return name.test(value);
      break;
    }
    case 'description': {
      const name = /^[A-Za-z0-9-@,*#._+? ]{1,250}$/;
      return name.test(value);
      break;
    }
    case 'string':
      const string = /^.{1,250}$/;
      return string.test(value);
      break;
    case 'pincode':
      const pincode = /^(\d{6})$/;
      return pincode.test(value);
      break;
    case 'ifsc':
      const ifsc = /^[A-Z]{4}[0]{1}[a-zA-Z0-9]{6}$/;
      return ifsc.test(value);
      break;
    case 'mobile':
      const mobile = /^(\d{10})$/;
      return mobile.test(value);
      break;
    case 'phone':
      const phone = /^(\d{11})$/;
      return phone.test(value);
      break;
    case 'pan':
      const pan =
        /^([A-Z]){3}([ABCFGHLJPTE]){1}([A-Z]){1}([0-9]){4}([A-Z]){1}?$/;
      return pan.test(value);
      break;
    case 'email':
      const email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,10})+$/;
      return email.test(value);
      break;
    case 'aadhaar':
      const aadhaar = /(^.{8}[0-9]{4})$/;
      return aadhaar.test(value);
      break;
    case 'date':
      const date = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
      return date.test(value);
      break;
    case 'dob':
      const dob = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
      return dob.test(value);
      break;
    case 'float':
      const float = /^[+-]?\d+(\.\d+)?$/;
      return float.test(value);
      break;
    case 'passport':
      const passport = /^[A-Z][0-9]{7}$/;
      return passport.test(value);
      break;
    case 'number':
      const number = /^[0-9]*$/;
      return number.test(value);
      break;
    case 'integer':
      const integer = /^[-+]?\d*$/;
      return integer.test(value);
      break;t(value);
      break;
    case 'driving':
      const driving = /^([A-Z]{2}[0-9]{2}\s[0-9]{11})+$/;
      return driving.test(value);
      break;
    case 'epic':
      const epic = /^([a-zA-Z]){3}([0-9]){7}?$/;
      return epic.test(value);
      break;
    case 'alphanum':
      const alphanum = /^[a-zA-Z0-9]{1,50}$/;
      return alphanum.test(value);
      break;
    case 'twodigit':
      const twodigit = /^\d{2}$/;
      return twodigit.test(value);
      break;
    case 'alpha':
      const alpha = /^[A-Za-z\s]{1,250}$/;
      return alpha.test(value);
      break;
    case 'singleAlpha':
      const singleAlpha = /^[A-Z\s]{1}$/;
      return singleAlpha.test(value);
      break;
    case 'consent':
      const consent = /^\w{1}$/;
      return consent.test(value);
      break;
    case 'timestamp':
      const timestamp = /^(\d{10})$/;
      return timestamp.test(value);
      break;
    case 'password': 
      const password = /^[\w\W]{0,16}$/
      return password.test(value);
      break;
    default:
      return true;
      break;
  }
};

const isUrlValid = (input) => {
  var regexQuery =
    '^(https?://)?(www\\.)?([-a-z0-9]{1,63}\\.)*?[a-z0-9][-a-z0-9]{0,61}[a-z0-9]\\.[a-z]{2,6}(/[-\\w@\\+\\.~#\\?&/=%]*)?$';
  var url = new RegExp(regexQuery, 'i');
  return url.test(input);
};

const getPickerFromObj = (obj, key, matcher, picker) => {
  const resultObj = obj.filter((item) => {
    return item[key] == matcher;
  });
  return resultObj[0][picker];
};

const getFileExtension = (filename) => {
  var dot_pos = filename.lastIndexOf('.');
  if (dot_pos == -1) {
    return '';
  }
  return filename.substr(dot_pos + 1).toLowerCase();
};

const FileTypeValidation = (fileName, FileType) => {
  let extension = getFileExtension(fileName);
  switch (FileType.toUpperCase()) {
    case 'PDF':
      return !(extension == 'PDF' || extension == 'pdf') ? false : true;
      break;
    case 'IMAGE':
      return !(
        extension == 'jpg' ||
        extension == 'jpeg' ||
        extension == 'png' ||
        extension == 'gif'
      )
        ? false
        : true;
      break;
    case 'DOCX':
      return !(extension == 'doc' || extension == 'docx') ? false : true;
      break;
    case 'TXT':
      return !(extension == 'txt') ? false : true;
      break;
    case 'JSON':
      return !(extension == 'json') ? false : true;
      break;
    case 'XLS':
      return !(extension == 'xlsx' || extension == 'xls') ? false : true;
      break;
    case 'CSV':
      return !(extension == 'csv') ? false : true;
      break;
    default:
      return false;
  }
};

const genericMail = (data, callback) => {
  const msg = {
    to: data.to,
    cc: data.cc,
    from: data.from,
    templateId: data.templateId,
    dynamicTemplateData: data.dynamicTemplateData,
  };
  var sgKey = process.env.SENDGRID_API_KEY;
  sgMail.setApiKey(sgKey);
  sgMail
    .send(msg)
    .then(() => {
      return callback(null, JSON.stringify(msg, null, 4));
    })
    .catch((error) => {
      return callback(null, {});
    });
};

const genericMailAttchement = (data, callback) => {
  const pathToAttachment = data.filename;
  const attachment = fs.readFileSync(pathToAttachment).toString('base64');
  const msg = {
    to: data.to,
    cc: data.cc,
    from: data.from,
    templateId: data.templateId,
    subject: data.subject,
    dynamicTemplateData: data.dynamicTemplateData,
    attachments: [
      {
        content: attachment,
        filename: data.filename,
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };
  var sgKey = process.env.SENDGRID_API_KEY;
  sgMail.setApiKey(sgKey);
  sgMail
    .send(msg)
    .then(() => {
      return callback(null, JSON.stringify(msg, null, 4));
    })
    .catch((error) => {
      return callback(null, {});
    });
};

const removeSalutation = (fullNames) => {
  try {
    var regex = /(Mr|MR|Ms|Miss|Mrs|Dr|Sir)(\.?)\s/;
    var match = regex.exec(fullNames);
    return match !== null ? fullNames.replace(match[0], '') : fullNames;
  } catch (e) {
    return fullNames;
  }
};

const convertImageToBase64EncodedFile = async (base64, document_type) => {
  try {
    const pdfDoc = new PDFDocument();

    if (document_type === 'txt') {
      const textContent = Buffer.from(base64, 'base64').toString();
      pdfDoc.text(textContent);
    } else if (document_type === 'jpg' || document_type === 'jpeg' || document_type === 'png') {
      const imageBuffer = Buffer.from(base64, 'base64');
      pdfDoc.image(imageBuffer, 50, 50, { width: 500 });
    } else {
      throw new Error('Invalid document type');
    }

    // Convert the PDF to base64
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));

    const pdfBase64 = await new Promise((resolve, reject) => {
      try {
        pdfDoc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          const base64String = pdfBuffer.toString('base64');
          resolve(base64String);
        });
        pdfDoc.end();
      } catch (err) {
        reject(err);
      }
    });

    return pdfBase64;

  } catch (err) {
    throw err;
  }
}

const convertImgBase64ToPdfBase64 = (base64, cb) => {
  let name = Date.now();
  var pngFileName = `./${name}.png`;
  var base64Data = base64;
  fs.writeFile(pngFileName, base64Data, 'base64', function (err) {
    if (err) return cb(true, null);
    const doc = new PDFDocument({
      size: 'A4',
    });
    doc.image(pngFileName, {
      fit: [500, 400],
      align: 'center',
      valign: 'center',
    });
    doc
      .pipe(fs.createWriteStream(`./${name}.pdf`))
      .on('finish', function (err) {
        fs.unlink(`./${name}.png`, (errUnlinkHtml) => {
          if (errUnlinkHtml) return cb(true, null);
        });
        pdf2base64(`./${name}.pdf`)
          .then((pdfResp) => {
            fs.unlink(`./${name}.pdf`, (errUnlinkHtml) => {
              if (errUnlinkHtml) return cb(true, null);
              return cb(null, pdfResp);
            });
          })
          .catch((error) => {
            fs.unlink(`./${name}.pdf`, (errUnlinkHtml) => {
              if (errUnlinkHtml) return cb(true, null);
            });
            return cb(true, null);
          });
      });
    doc.end();
  });
};

const validateData = (type, value, callback) => {
  switch (type) {
    case 'string':
      const string = /^.{1,250}$/;
      callback(string.test(value));
      break;
    case 'pincode':
      const pincode = /^(\d{6})$/;
      callback(pincode.test(value));
      break;
    case 'ifsc':
      const ifsc = /^[A-Z]{4}[0]{1}[a-zA-Z0-9]{6}$/;
      callback(ifsc.test(value));
      break;
    case 'mobile':
      const mobile = /^(\d{10})$/;
      callback(mobile.test(value));
      break;
    case 'phone':
      const phone = /^(\d{11})$/;
      callback(phone.test(value));
      break;
    case 'pan':
      const pan =
        /^([A-Z]){3}([ABCFGHLJPTE]){1}([A-Z]){1}([0-9]){4}([A-Z]){1}?$/;
      callback(pan.test(value));
      break;
    case 'email':
      const email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,10})+$/;
      callback(email.test(value));
      break;
    case 'aadhaar':
      const aadhaar = /(^.{8}[0-9]{4})$/;
      callback(aadhaar.test(value));
      break;
    case 'date':
      const date = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
      callback(date.test(value));
      break;
    case 'dateTime':
      const dateTime =
        /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])\ (0[0-9]|1[0-9]|2[0123])\:([012345][0-9])\:([012345][0-9])$)/;
      callback(dateTime.test(value));
      break;
    case 'dob':
      const dob = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
      callback(dob.test(value));
      break;
    case 'float':
      const float = /^[+-]?\d+(\.\d+)?$/;
      callback(float.test(value));
      break;
    case 'passport':
      const passport = /^[A-Z][0-9]{7}$/;
      callback(passport.test(value));
      break;
    case 'number':
      const number = /^[0-9]*$/;
      callback(number.test(value));
      break;
    case 'gst':
      const gst =
        /^([0][1-9]|[1-2][0-9]|[3][0-8]|[9][79])([a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9a-zA-Z]{1}[zZ]{1}[0-9a-zA-Z]{1})+$/;
      callback(gst.test(value));
      break;
    case 'driving':
      const driving = /^([A-Z]{2}[0-9]{2}\s[0-9]{11})+$/;
      callback(driving.test(value));
      break;
    case 'epic':
      const epic = /^([a-zA-Z]){3}([0-9]){7}?$/;
      callback(epic.test(value));
      break;
    case 'ack':
      const ack = /^([0-9]){15}$/;
      callback(ack.test(value));
      break;
    case 'uan':
      const uan = /^([A-Z]){2}([0-9]){2}([A-Z]){1}([0-9]){7}?$/;
      callback(uan.test(value));
      break;
    case 'vpa':
      const vpa = /^\w+.\w+@\w+$/;
      callback(vpa.test(value));
      break;
    case 'twodigit':
      const twodigit = /^\d{2}$/;
      callback(twodigit.test(value));
      break;
    case 'alpha':
      const alpha = /^[A-Za-z\s]{1,250}$/;
      callback(alpha.test(value));
      break;
    case 'singleAlpha':
      const singleAlpha = /^[A-Z\s]{1}$/;
      callback(singleAlpha.test(value));
      break;
    case 'consent':
      const consent = /^\w{1}$/;
      callback(consent.test(value));
      break;
    case 'timestamp':
      const timestamp = /^(\d{10})$/;
      callback(timestamp.test(value));
      break;
    default:
      callback(true);
      break;
  }
};

//helper to change YY-MM-DDTHH:MM:SS.mssZ  to YY-MM-DD HH:MM:SS
const convertDateTime = (today) => {
  var day = today.getDate() + '';
  var month = today.getMonth() + 1 + '';
  var year = today.getFullYear() + '';
  var hour = today.getHours() + '';
  var minutes = today.getMinutes() + '';
  var seconds = today.getSeconds() + '';
  function checkZero(data) {
    if (data.length == 1) {
      data = '0' + data;
    }
    return data;
  }
  day = checkZero(day);
  month = checkZero(month);
  year = checkZero(year);
  hour = checkZero(hour);
  minutes = checkZero(minutes);
  seconds = checkZero(seconds);
  return (
    year + '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + seconds
  );
};

const comparePassword = async (userPassword, hash) => {
  let isMatch = false;
  await bCrypt.compare(userPassword, hash).then((match) => {
    isMatch = match;
  });
  return isMatch;
};

const generateToken = (obj, expiresIn) => {
  obj.environment = process.env.ENVIRONMENT;
  return jwt.sign(obj, process.env.SECRET_KEY);
};

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

//SendResponse function which will handle the incoming response with valid Error Code
const sendResponse = (req, res, next, httpCode, message, statusCode, success, uploadDocumentData) => {
  let response = {};

  if (httpCode === 200) {
    response = {
      customer_id: req.body.customer_id || null,
      entity_id: req.body.entity_id || null,
      uploadDocumentData: uploadDocumentData || {
      document_id: document_id||null,
      message: message || 'Success'
      },
      success: success,
      status_code: statusCode || null
    };
  } else {
    response = {
      success: false,
      message: message || null,
      status_code: statusCode || null
    };
  }

  return res.status(httpCode).json(response);
};

module.exports = {
  validateTemplateFormat,
  uploadXmlDataToS3Bucket,
  getPickerFromObj,
  validateDataSync,
  getFileExtension,
  FileTypeValidation,
  isUrlValid,
  genericMail,
  removeSalutation,
  convertImageToBase64EncodedFile,
  convertImgBase64ToPdfBase64,
  genericMailAttchement,
  validateData,
  convertDateTime,
  comparePassword,
  generateToken,
  toTitleCase,
  sendResponse,
};
