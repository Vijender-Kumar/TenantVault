var autoIncrement = require("mongoose-auto-increment");
var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
var bcrypt = require("bcryptjs");

var userSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: String,
      allowNull: true,
    },
    userpic: {
      type: String,
      allowNull: true,
    },
    userroles: {
      type: Array,
      allowNull: false,
    },
    userpass: {
      type: String,
      allowNull: false,
    },
    userflag: {
      type: Boolean,
      allowNull: true,
    },
    email: {
      type: String,
      allowNull: true,
    },
    type: {
      type: String,
      allowNull: true,
    },
    user_attempt: {
      type: Boolean,
      allowNull: true,
    },
    status: {
      type: Boolean,
      allowNull: false,
      default: true,
    },
    updated_by: {
      type: String,
      allowNull: true,
    },
    updated_on: {
      type: Date,
      default: Date.now,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    created_date: {
      type: Date,
      default: Date.now,
    },
    password_updated_at: {
      type: Date,
      allowNull: true,
    },
    last_login_at: {
      type: Date,
      allowNull: true,
    },
    recent_passwords: {
      type: Array,
      allowNull: true,
    },
    created_by: {
      type: String,
      allowNull: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_date",
      updatedAt: "updated_on",
    },
  }
);

autoIncrement.initialize(mongoose.connection);
userSchema.plugin(autoIncrement.plugin, "user_id");

var Users = (module.exports = mongoose.model("user", userSchema));

// AddOne Method: Handles encryption of the password before saving
module.exports.addOne = async (user) => {
  var new_user = new Users(user);
  const password = user.userpass;
  const saltRounds = 10;
  try {
    new_user.userpass = await bcrypt.hash(password, saltRounds);
    return new_user.save();
  } catch (error) {
    return error;
  }
};

// Other utility methods remain unchanged
module.exports.getAll = () => {
  return Users.find({}).select("-userpass").sort({
    created_date: -1,
  });
};

module.exports.getAllByCreatedBy = (createdByUserId) => {
  return Users.find({ created_by: createdByUserId })
    .select("-userpass")
    .sort({ created_date: -1 });
};


module.exports.checkEmailAlreadyExists = (user) => {
  return Users.findOne({
    $and: [
      {
        email: user.email,
      },
    ],
  });
};

module.exports.checkUserByEmailUsername = (user) => {
  return Users.findOne({
    $and: [
      {
        email: user.email,
      },
      {
        username: user.username,
      },
    ],
  });
};

module.exports.findById = (id) => {
  return Users.findOne({
    _id: id,
  });
};

module.exports.selectOne = (email) => {
  return Users.findOne({
    email,
  });
};

module.exports.updateOne = (userIdValue, userDataVal) => {
  return Users.findOneAndUpdate(
    {
      _id: userIdValue,
    },
    {
      $set: {
        username: userDataVal.username,
        userroles: userDataVal.userroles,
        userpass: userDataVal.encryptedPassword,
        password_updated_at: userDataVal.password_updated_at,
      },
    }
  );
};

module.exports.updateStatus = (userData) => {
  const query = {
    _id: userData.id,
  };
  const status = {
    status: userData.status,
  };

  return Users.findOneAndUpdate(query, status, {
    new: true,
  });
};

module.exports.findByUserEmail = (email) => {
  return Users.findOne({
    email: email,
  });
};

module.exports.updateUserById = (id, data) => {
  return Users.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {
      new: true,
    }
  );
};

module.exports.getByUsername = (username) => {
  return Users.findOne({
    username,
  });
};

module.exports.updateUserData = (_id, data) => {
  return Users.findOneAndUpdate({ _id }, data, {
    new: true,
  });
};

module.exports.getBySearchString = (searchstring) => {
  return Users.find({
    $or: [
      { username: { $regex: searchstring, $options: "i" } },
      { email: { $regex: searchstring, $options: "i" } },
    ],
  });
};


