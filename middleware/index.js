const User = require("../models/users");
const Chef = require("../models/chefs");

// all middleware goes here
const middlewareObj = {};

// user authentication middleware
middlewareObj.checkAuthentication = function (req, res, next) {
        
        User.findOne({email:req.session.user}, (err, foundGroup) => {
            if (err || !foundGroup) {
                // req.logout();
                console.log("logged out");
                req.flash("error", "You Cannot Do that, kindly get authenticated");
                res.redirect("/get_signin");
            } else {
                 return next();
            }
        });

};

// chef authentication middleware
middlewareObj.checkchefAuthentication = function (req, res, next) {

        Chef.findOne({email:req.session.chef}, (err, foundGroup) => {
            if (err || !foundGroup) {
                // req.logout();
                req.flash("error", "You Cannot Do that, kindly get authenticated");
                res.redirect("/get_chef_signup");
            } else {
                return next();
            }
        });

};

module.exports = middlewareObj;
