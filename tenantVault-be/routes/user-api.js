const bodyParser = require("body-parser");
const { check, validationResult } = require("express-validator");
//const auth = require('../services/auth/auth.js');
const User = require("../models/user-schema.js");
const mails = require("../services/mail/genericMails.js");
const service = require("../services/mail/mail.js");
const bcrypt = require("bcryptjs");
const helper = require("../utils/helper.js");
const moment = require("moment");

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get("/api/user", async (req, res) => {
    try {
      console.log("here");
      const userRes = await User.getAll();
      res.send(userRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    try {
      const userRes = await User.findById(req.params.id);
      if (!userRes) {
        throw {
          message: `No user found for id: ${req.params.id}`,
        };
      }
      return res.send(userRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get("/api/user/find_by_created_by/:created_by", async (req, res) => {
    try {
      const userRes = await User.getAllByCreatedBy(req.params.created_by);
      if (!userRes) {
        throw {
          message: `No user found for created_by: ${req.params.created_by}`,
        };
      }
      return res.send(userRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post("/api/usersearch", async (req, res) => {
    try {
      const userData = await User.getBySearchString(req.body.searchstring);
      if (!userData) {
        throw {
          message: `No user present with string: ${req.body.searchstring}`,
        };
      }
      return res.send(userData);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //Create User
  app.post(
    "/api/user",
    [
      check("username").notEmpty().withMessage("Please enter username"),
      check("email").notEmpty().withMessage("Please enter email id"),
      check("userroles")
        .isArray()
        .notEmpty()
        .withMessage("At least one role is required"),
      check("userpass").notEmpty().withMessage("Please send user password"),
      check("userpassToEmail")
        .notEmpty()
        .withMessage("Please send userpassToEmail"),
    ],
    async (req, res) => {
      try {
        const userData = req.body;

        // Validate username
        if (!helper.validateDataSync("fullname", userData.username))
          throw {
            success: false,
            message: "Please enter a valid name",
          };

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]["msg"],
          };

        const userRoles = userData.userroles;

        // Role-based validation
        if (userRoles.includes("Admin") || userRoles.includes("SuperAdmin")) {
          const allowedEmails = process.env.ALLOWED_ADMIN_EMAILS.split(",");
          if (!allowedEmails.includes(userData.email)) {
            throw {
              success: false,
              message:
                "Only specific emails are allowed to create Admin/SuperAdmin users.",
            };
          }

          if (userRoles.includes("Owner") || userRoles.includes("Tenant")) {
            throw {
              success: false,
              message:
                "Admin or SuperAdmin cannot coexist with Owner or Tenant.",
            };
          }
          userData.type = "admin-access";
        } else if (userRoles.includes("Owner")) {
          if (userRoles.length > 1) {
            throw {
              success: false,
              message: "Owner role cannot coexist with other roles.",
            };
          }

          if (!userData.created_by) {
            throw {
              success: false,
              message: "Owner must be created by an Admin (username or email).",
            };
          }

          // Find Admin and update owner list
          userData.created_by = await findAndUpdateAdminWithOwner(
            userData.created_by,
            userData._id
          );
          userData.type = "owner-access";
        } else if (userRoles.includes("Tenant")) {
          if (userRoles.length > 1) {
            throw {
              success: false,
              message: "Tenant role cannot coexist with other roles.",
            };
          }

          if (!userData.created_by) {
            throw {
              success: false,
              message:
                "Tenant must be created by an Owner (username or email).",
            };
          }

          // Find Owner and update tenant list
          userData.created_by = await findAndUpdateOwnerWithTenant(
            userData.created_by,
            userData._id
          );
          userData.type = "tenant-access";
        } else {
          throw {
            success: false,
            message:
              "Invalid roles provided. Roles must include Admin, SuperAdmin, Owner, or Tenant.",
          };
        }

        // Check if email already exists
        const isExistByEmail = await User.selectOne(userData.email);
        if (isExistByEmail)
          throw {
            success: false,
            message: "Email ID is already in use.",
          };

        // Add user to the database
        const userRes = await User.addOne(userData);
        if (!userRes)
          throw {
            message: "Error while adding user data to database",
          };

        // Send email notification
        // const subject = "Tenant Vault Dashboard user created.";
        // const htmlcontent = await mails.genericMails("createuser", userData);
        // const mailResp = await service.sendMail(
        //   userData.email,
        //   subject,
        //   htmlcontent
        // );
        // if (!mailResp.messageId) {
        //   throw {
        //     success: false,
        //     message: "User added, but error while sending mail, Mail will be sent automatically after sometime.",
        //   };
        // }

        return res.send({
          message: "User created successfully.",
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send(error);
      }
    }
  );

  //reset user password
  app.post(
    "/api/resetpassword",
    [
      check("email").notEmpty().withMessage("Please send user email id"),
      check("confirmPassword")
        .notEmpty()
        .withMessage("Please provide a strong and valid password")
        .isStrongPassword()
        .withMessage("Please provide a strong and valid password"),
    ],
    async (req, res) => {
      try {
        const data = req.body;

        // Validate the input data
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]["msg"],
          });

        // Check user existence by email
        const respUser = await User.findByUserEmail(data.email);
        if (!respUser)
          throw {
            message: "Error while finding user",
          };

        // Compare current password with stored password
        const flag = await helper.comparePassword(
          data.currentPassword,
          respUser.userpass
        );
        if (!flag) {
          throw {
            success: false,
            message: "Current password is incorrect",
          };
        }

        // Ensure the new password is different from the current password
        if (data.confirmPassword === data.currentPassword) {
          throw {
            success: false,
            message: "Current password and new password cannot be the same",
          };
        }

        // Ensure the new password is not already in the recent passwords
        if (
          respUser.recent_passwords &&
          (await Promise.all(
            respUser.recent_passwords.map(async (oldPassword) => {
              return await bcrypt.compare(data.confirmPassword, oldPassword);
            })
          ).then((results) => results.includes(true)))
        ) {
          throw {
            success: false,
            message:
              "The new password was recently used. Please choose another.",
          };
        }

        // Hash the new password
        const saltRounds = 10;
        data.encryptedPassword = await bcrypt.hash(
          data.confirmPassword,
          saltRounds
        );

        // Add the current password to the `recent_passwords` array
        if (!respUser.recent_passwords) {
          respUser.recent_passwords = [];
        }
        respUser.recent_passwords.push(respUser.userpass);

        // Limit the array to the last 5 passwords
        if (respUser.recent_passwords.length > 5) {
          respUser.recent_passwords = respUser.recent_passwords.slice(-5);
        }

        // Prepare user data for password update
        data.email = respUser.email;
        data.username = respUser.username;
        data.password = data.confirmPassword;

        // Set the timestamp for password update
        data.password_updated_at = moment();

        // Log for debugging (remove in production)
        console.log("respUser:", respUser);
        console.log("New encrypted password:", data.encryptedPassword);

        // Update the user's password and recent passwords
        const updateUser = await User.updateUserById(respUser._id, {
          userpass: data.encryptedPassword,
          password_updated_at: data.password_updated_at,
          recent_passwords: respUser.recent_passwords,
        });

        if (!updateUser)
          throw {
            message: "Error while updating user",
          };

        // Prepare email content
        // const subject = "Password updated successfully";
        // const htmlcontent = mails.genericMails("passwordreset", data);

        // Send email notification
        // const mailres = await service.sendMail(
        //   data.email,
        //   subject,
        //   htmlcontent
        // );
        // if (!mailres) throw { message: "Password has been changed successfully, but error while sending mail, Mail will be sent automatically after sometime." };

        res.send({
          message:
            "Password has been changed successfully. Please log in with the new password.",
        });
      } catch (error) {
        console.error(error); // Log the error for debugging
        return res.status(400).send(error);
      }
    }
  );

  // app.put(
  //   "/api/user/:id",
  //   [
  //     check("username").notEmpty().withMessage("Please enter username"),
  //     check("email").notEmpty().withMessage("Please enter email id"),
  //     check("type").notEmpty().withMessage("Please select user type"),
  //     check("userroles").notEmpty().withMessage("Atleast one role is required"),
  //   ],
  //   async (req, res) => {
  //     const userId = req.params.id;
  //     const userData = req.body;
  //     try {
  //       const errors = validationResult(req);
  //       if (!errors.isEmpty())
  //         throw {
  //           message: errors.errors[0]["msg"],
  //         };

  //       if (!helper.validateDataSync("fullname", userData.username))
  //         throw {
  //           success: false,
  //           message: "Please enter valid name",
  //         };
  //       if (!helper.validateDataSync("email", userData.email))
  //         throw {
  //           success: false,
  //           message: "Please enter valid email",
  //         };
  //       const isExistByEmail = await User.selectOne(userData.email);
  //       if (isExistByEmail && userId != isExistByEmail?._id)
  //         throw {
  //           success: false,
  //           message: "Email id is already in use.",
  //         };
  //       const userUpdated = await User.updateUserById(userId, userData);
  //       res.send({
  //         message: "User updated successfully.",
  //       });
  //     } catch (error) {
  //       return res.status(400).send(error);
  //     }
  //   }
  // );

  // //change the user status (Active or Inactive)
  // app.put("/api/user", async (req, res) => {
  //   const userData = req.body;
  //   try {
  //     const userUpdated = await User.updateStatus(userData);
  //     if (!userUpdated)
  //       throw {
  //         message: "Error while updating user status",
  //       };
  //     res.send({
  //       message: "User updated successfully.",
  //     });
  //   } catch (error) {
  //     return res.status(400).send(error);
  //   }
  // });

  // app.put(
  //   "/api/updateUser",
  //   async (req, res) => {
  //     try {
  //       const errors = validationResult(req);
  //       if (!errors.isEmpty())
  //         return res.status(422).json({
  //           message: errors.errors[0]["msg"],
  //         });
  //       const userData = req.body;
  //       const userId = req.body.user_id;
  //       if (userData.usercompany) {
  //         const company = await Company.findById(userData.usercompany);
  //         if (!company)
  //           throw {
  //             message: "Error while fetching company data",
  //           };
  //         if (company.status !== 1)
  //           throw {
  //             message: "Company is not active, contact system administrator",
  //           };
  //         const obj = {
  //           username: userData.username,
  //           designation: userData.designation,
  //           department: userData.department.join(),
  //           userroles: userData.userroles.join(),
  //           usercompany: company._id,
  //           usercompanyname: company.code,
  //           type: userData.type,
  //           updatedby: userData.updatedby,
  //           updatedon: Date.now(),
  //         };
  //         const updateCompanyUser = await User.updateUserById(userId, obj);
  //         if (!updateCompanyUser)
  //           throw {
  //             message: "Error while updating company user",
  //           };
  //         return res.send({
  //           message: "User data updated successfully.",
  //         });
  //       } else {
  //         if (
  //           userData.type === "admin" &&
  //           userData.department === "credit" &&
  //           !userData.approval_amount_threshold
  //         ) {
  //           throw {
  //             message: "approval_amount_threshold is required",
  //           };
  //         }
  //         const obj = {
  //           username: userData.username,
  //           designation: userData.designation,
  //           department: userData.department.join(),
  //           userroles: userData.userroles.join(),
  //           type: userData.type,
  //           approval_amount_threshold: userData.approval_amount_threshold
  //             ? userData.approval_amount_threshold
  //             : "",
  //           updatedby: userData.updatedby,
  //           updatedon: Date.now(),
  //         };
  //         const updateUser = await User.updateUserById(userId, obj);
  //         if (!updateUser)
  //           throw {
  //             message: "Error while updating user",
  //           };
  //         return res.send({
  //           message: "User data updated succefully.",
  //         });
  //       }
  //     } catch (error) {
  //       return res.status(400).send(error);
  //     }
  //   }
  // );

  // /*app.get('/api/roleMetrix', function (req, res) {
  // 	const details = {};
  // 	Designations.getAll((err, designations) => {
  // 		if (err) {
  // 			return res.status(400).json({ message: 'Something went wrong' });
  // 		} if (designations) {
  // 			details.designations = designations;
  // 			Departments.getAll((errd, departments) => {
  // 				if (errd) {
  // 					return res.status(400).json({ message: 'Something went wrong' });
  // 				} if (departments) {
  // 					details.departments = departments;
  // 					Roles.getAll((errr, roles) => {
  // 						if (errr) {
  // 							return res.status(400).json({ message: 'Something went wrong' });
  // 						} if (roles) {
  // 							details.roles = roles;
  // 							res.send(details);
  // 						}
  // 					})
  // 				}
  // 			})
  // 		}
  // 	})
  // })

  // 	//role update  api
  // app.put('/api/roles-update', [AccessLog.maintainAccessLog], function (req, res) {
  // 	const roleData = req.body;
  // 	Roles.updateOne(roleData, roleData.id, (err, role) => {
  // 		if (err) {
  // 			return res.status(400).json({ message: err });
  // 		} if (role) {
  // 			res.send({ message: 'Role updated here.', role })
  // 		}
  // 	})
  // })
  // */
  const findAndUpdateOwnerWithTenant = async (ownerUsername, tenantId) => {
    // Find Owner by username
    const ownerUser = await User.findOne({ username: ownerUsername });

    if (!ownerUser || ownerUser.type !== "owner-access") {
      throw {
        success: false,
        message: "Invalid Owner username provided in created_by.",
      };
    }

    // Update Owner's tenant list with new Tenant ID
    const ownerUpdate = await User.updateOne(
      { _id: ownerUser._id }, // Owner ID
      { $push: { tenantuserid: tenantId } } // Add Tenant ID to tenantuserid array
    );

    if (!ownerUpdate) {
      throw {
        success: false,
        message: "Tenant created, but failed to update Owner's tenant list.",
      };
    }

    return ownerUser._id; // Return the Owner's ID if everything is successful
  };

  const findAndUpdateAdminWithOwner = async (adminUsername, ownerId) => {
    // Find Admin by username
    const adminUser = await User.findOne({ username: adminUsername });

    if (!adminUser || adminUser.type !== "admin-access") {
      throw {
        success: false,
        message: "Invalid Admin username provided in created_by.",
      };
    }

    // Update Admin's owner list with new Owner ID
    const adminUpdate = await User.updateOne(
      { _id: adminUser._id }, // Admin ID
      { $push: { owneruserid: ownerId } } // Add Owner ID to owneruserid array
    );

    if (!adminUpdate) {
      throw {
        success: false,
        message: "Owner created, but failed to update Admin's owner list.",
      };
    }

    return adminUser._id; // Return the Admin's ID if everything is successful
  };

};
