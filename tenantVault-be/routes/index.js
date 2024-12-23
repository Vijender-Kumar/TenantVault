"use strict";

function includeAllRoutes(app, passport) {
  require('./login-api')(app, passport);
  require('./user-api')(app, passport);
}

module.exports = function (app, passport) {
  includeAllRoutes(app, passport);
};
