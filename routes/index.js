const express = require('express');
const mongoose = require('mongoose');
// const passport = require("passport");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
var async = require("async");
var crypto = require("crypto");
const saltRounds = 10;
const { locals } = require('../app');
var middleware = require("../middleware");


const router = express.Router();

const User = require('../models/users');
const Chef = require('../models/chefs');
const Admin = require('../models/admin');
const Order = require('../models/order');
// const { session } = require('passport');
const { Session } = require('express-session');
const { response } = require('express');
const order = require('../models/order');


// connecting to database #mongodb
let url = process.env.DATABASEURL || "mongodb://localhost/mp";
 mongoose.connect(url, { useNewUrlParser: true,useUnifiedTopology: true,useCreateIndex: true,useFindAndModify:false },function(err,database){
   console.log('connected to mongodb');
 });

// code for nodemailer
var transporter = nodemailer.createTransport({
  service: process.env.SERVICE,
  auth: {
    user: process.env.FROM_MAIL, //gmail mail-id example@gmail.com
    pass: process.env.PASSWORD //password
  }
});
 
// Some Global variables
 router.use((req,res,next)=>{
  res.locals.session = req.session;
  res.locals.user = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

/* --------------------------------------------------------------------------------------------------------------------------------------- 
//                                                            Password reset code
 --------------------------------------------------------------------------------------------------------------------------------------- */

/*----------------------------------------------------------- for user ---------------------------------------------------------------------*/

// GET method for rendering the password reset page
router.get('/get_password_reset',(req,res)=>{
  res.render('password_reset');
});

// GET method for password reset
router.get("/password_reset", (req, res) => {
  req.flash("success","Enter your email to change your password");
  res.redirect("/get_password_reset");
});

router.post("/password_reset", (req, res, next) => {
  // use waterfall to increase readability of the following callbacks
  async.waterfall([
    function(done) {
      // generate random token
      crypto.randomBytes(20, (err, buf) => {
        let token = buf.toString("hex");
        done(err, token);
      });
    },
    function(token, done) {
      // find who made the request and assign the token to them
      User.findOne({ email: req.body.email }, (err, user) => {
        if (err) throw err;
        if (!user) {

          req.flash("error", "That account doesn't exist");
          console.log("That account does not exists");
          return res.redirect("/get_password_reset");
        }
        // console.log(typeof(user));
        // user.resetPasswordToken = token;
        // user.resetPasswordExpires = Date.now() + 3600000; // ms, 1hour
        User.findOneAndUpdate({email:req.body.email},{resetPasswordToken:token,resetPasswordExpires:Date.now() + 3600000},(err, response)=>{
          if(err)
          console.log(err);
          console.log("here\n"+response);
          
        });
        User.findOne({email:req.body.email},(err,ans)=>{
          if(err)
          console.log(err);
          done(err, token, ans);
        });
        // user.save((err,response)=>{
        //   if(err)
        //   console.log(err);
        //   console.log(response);
        //   done(err, token, user);
        // });
        // user.save(err => done(err, token, user));
      });
    },
    function(token, user, done) {
      // indicate email account and the content of the confirmation letter
      let mailOptions = {
        from: process.env.FROM_MAIL,
        to: user.email,
        subject: "Reset your Account Password",
        text: "Hi " + user.username + ",\n\n" +
              "We've received a request to reset your password. If you didn't make the request, just ignore this email. Otherwise, you can reset your password using this link:\n\n" +
              "http://" + req.headers.host + "/reset/" + token + "\n\n" +
              "Thanks.\n"+
              "\n"+"The Chef's Food Team"
      };
      // send the email
      transporter.sendMail(mailOptions, err => {
        if (err) throw err;
        console.log("mail sent");
        req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
        done(err, "done");
      });
    }
  ], err => {
    if (err) return next(err);
    res.redirect("/get_password_reset");
  });
});

// reset password ($gt -> selects those documents where the value is greater than)
router.get("/reset/:token", (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    if (err) throw err;
    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      res.redirect("/get_password_reset");
    } else { 
       }
       res.render("reset", { token: req.params.token })
  });
});

// update password
router.post("/reset/:token", (req, res) => {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
        if (err) throw err;
        if (!user) {
          req.flash("error", "Password reset token is invalid or has expired.");
          console.log("token is invalid or expired");
          return res.redirect("/get_password_reset");
        }
        // check password and confirm password
        if (req.body.password === req.body.confirm) {

          bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
            // Store hash in your password DB.
            User.findOneAndUpdate({resetPasswordToken: req.params.token},{resetPasswordToken:null,resetPasswordExpires:null,password:hash},(err,ans)=>{
              if(err)
              console.log(err);

            });
            // user.resetPasswordToken = null;
            // user.resetPasswordExpires = null;
            // user.password = hash;
            // user.save((err,answer)=>{
            //   if(err)
            //   {
            //     req.flash("error","Some error occured please try after some time");
            //     return res.redirect("/get_signup");
            //   }

            //   console.log(answer);
            // });
            // add the login code here
            User.findOne({email:user.email},(err,result)=>{
              if(err)
              {
                req.flash("error",err.message);
                return res.redirect('/get_signin');
              }
              bcrypt.compare(req.body.password, result.password, function(err, response) {
                if(response == true)
                {
                  req.session.user = result.email;
                  done(err, user);
                }
                else{
                  req.flash("error","Password incorrect");
                  return res.redirect('/get_signin');
                }
            });
        
            });

          });
        }
         else {
          req.flash("error", "Passwords do not match");
          console.log("Password dont match");
          return res.redirect("back");
        } 
      });
    },
    function(user, done) {
      let mailOptions = {
        from: process.env.FROM_MAIL,
        to: user.email,
        subject: "Your Account Password has been changed",
        text: "Hi " + user.username + ",\n\n" +
              "This is a confirmation that the password for your account " + user.email + "  has just been changed.\n\n" +
              "Best,\n"+
              "The Chef's Team\n"
      };
      transporter.sendMail(mailOptions, err => {
        if (err) throw err;
        req.flash("success", "Your password has been changed.");
        console.log("Password changed");
        done(err);
      });
    },
  ], err => {
    if (err) throw err;
    res.redirect("/user_homepage");
  });
});

/*----------------------------------------------------------- for chef ---------------------------------------------------------------------*/

// GET method for rendering the password reset page
router.get('/get_chef_password_reset',(req,res)=>{
  res.render('chefpassword_reset');
});

// GET method for password reset
router.get("/chefpassword_reset", (req, res) => {
  req.flash("success","Enter your email to change your password");
  res.redirect("/get_chef_password_reset");
});

// Code for forgot password user
router.post("/chefpassword_reset", (req, res, next) => {
  // use waterfall to increase readability of the following callbacks
  async.waterfall([
    function(done) {
      // generate random token
      crypto.randomBytes(20, (err, buf) => {
        let token = buf.toString("hex");
        done(err, token);
      });
    },
    function(token, done) {
      // find who made the request and assign the token to them
      Chef.findOne({ email: req.body.email }, (err, user) => {
        if (err) throw err;
        if (!user) {
          req.flash("error", "That account doesn't exist.");
          console.log("That account does not exists");
          return res.redirect("/get_chef_password_reset");
        }
        
        // user.resetPasswordToken = token;
        // user.resetPasswordExpires = Date.now() + 3600000; // ms, 1hour
        
        // user.save(err => done(err, token, user));
        Chef.findOneAndUpdate({email:req.body.email},{resetPasswordToken:token,resetPasswordExpires:Date.now() + 3600000},(err, response)=>{
          if(err)
          console.log(err);
          
        });
        Chef.findOne({email:req.body.email},(err,ans)=>{
          if(err)
          console.log(err);
          done(err, token, ans);
        });
      });
    },
    function(token, user, done) {
      // indicate email account and the content of the confirmation letter
      let mailOptions = {
        from: process.env.FROM_MAIL,
        to: user.email,
        subject: "Reset your Account Password",
        text: "Hi " + user.username + ",\n\n" +
              "We've received a request to reset your password. If you didn't make the request, just ignore this email. Otherwise, you can reset your password using this link:\n\n" +
              "http://" + req.headers.host + "/reset_chef/" + token + "\n\n" +
              "Thanks.\n"+
              "\n"+"The Chef's Food Team"
      };
      // send the email
      transporter.sendMail(mailOptions, err => {
        if (err) throw err;
        console.log("mail sent");
        req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
        done(err, "done");
      });
    }
  ], err => {
    if (err) return next(err);
    res.redirect("/get_chef_password_reset");
  });
});

// reset password ($gt -> selects those documents where the value is greater than)
router.get("/reset_chef/:token", (req, res) => {
  Chef.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    if (err) throw err;
    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      res.redirect("/get_chef_password_reset");
    } else { 
       }
       res.render("reset_chef", { token: req.params.token })
  });
});

// update password
router.post("/reset_chef/:token", (req, res) => {
  async.waterfall([
     function(done) {
      Chef.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
        if (err) throw err;
        if (!user) {
          req.flash("error", "Password reset token is invalid or has expired.");
          console.log("token is invalid or expired");
          return res.redirect("/get_chef_password_reset");
        }
        // check password and confirm password
        if (req.body.password === req.body.confirm) {

          bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
            // Store hash in your password DB.
              await Chef.findOneAndUpdate({resetPasswordToken: req.params.token},{resetPasswordToken:null,resetPasswordExpires:null,password:hash},(err,ans)=>{
              if(err)
              console.log(err);
            });
            // user.resetPasswordToken = null;
            // user.resetPasswordExpires = null;
            // user.password = hash;
            // user.save((err,answer)=>{
            //   if(err)
            //   {
            //     req.flash("error","Some error occured please try after some time");
            //     return res.redirect("/get_chef_signin");
            //   }
            // });
            // add the login code here
           await Chef.findOne({email:user.email},(err,result)=>{
              if(err)
              {
                req.flash("error",err.message);
                return res.redirect('/get_chef_signin');
              }
              bcrypt.compare(req.body.password, result.password, function(err, response) {
                if(response == true)
                {
                  req.session.chef = result.email;
                  done(err, user);
                }
                else{
                  req.flash("error","Password incorrect");
                  return res.redirect('/get_chef_signin');
                }
              });
            });
          });
        } else {
          req.flash("error", "Passwords do not match");
          console.log("Password dont match");
          return res.redirect("back");
        } 
      });
    },
    function(user, done) {
      let mailOptions = {
        from: process.env.FROM_MAIL,
        to: user.email,
        subject: "Your Account Password has been changed",
        text: "Hi " + user.username + ",\n\n" +
              "This is a confirmation that the password for your account " + user.email + "  has just been changed.\n\n" +
              "Best,\n"+
              "The Chef's Team\n"
      };
      transporter.sendMail(mailOptions, err => {
        if (err) throw err;
        req.flash("success", "Your password has been changed.");
        console.log("Password changed");
        done(err);
      });
    },
  ], err => {
    if (err) throw err;
    res.redirect("/chef_homepage");
  });
});

/* --------------------------------------------------------------------------------------------------------------------------------------- 
//                                                            GET Methods
 --------------------------------------------------------------------------------------------------------------------------------------- */

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home');
});

/* GET for error page */
router.get('/error',(req,res,next)=>{
  res.render('error');
})

/* GET SignUp page */
router.get('/signup',(req,res,next)=>{
  req.flash("success","Please register to continue");
  res.redirect('/get_signup');
});

router.get('/get_signup',(req,res,next)=>{
  res.render('signup');
});

/* GET SignIn page */
router.get('/signin',(req,res,next)=>{
  req.flash("success","Please Sign In to continue");
  res.redirect('/get_signin');
});

router.get('/get_signin',(req,res,next)=>{
  res.render('signin');
});

/* USER homepage */
router.get('/user_homepage',middleware.checkAuthentication,(req,res,next)=>{
  res.redirect("/get_user_homepage");
});

router.get('/get_user_homepage',(req,res,next)=>{
  res.render('user_home',{chef:'',disp:0});
});

/* CHEF signin page */
router.get('/chef_signin',(req,res,next)=>{
  req.flash("success", "Please Sign In to continue");
  res.redirect('/get_chef_signin');
});

router.get('/get_chef_signin',(req,res,next)=>{
  res.render('chef_signin');
});

/* CHEF signup page */
router.get('/chef_signup',(req,res,next)=>{
  req.flash("success", "Please Register to continue");
  res.redirect('/get_chef_signup');
});

router.get('/get_chef_signup',(req,res,next)=>{
  res.render('chef_signup');
});

/* CHEF homepage */
router.get('/chef_homepage',middleware.checkchefAuthentication,(req,res,next)=>{
  res.render('chef_homepage');
});

/* USER Logout */
router.get('/user_logout',function(req,res){
  // req.logout();
  req.session.destroy((err)=>{
    if(err)
    console.log("error destroying the session");
  });
  // if(!req.isAuthenticated())
    res.redirect('/signin');
  // else
  // console.log("There is some error in if part");
});

/* CHEF logout */
router.get('/chef_logout',(req,res,next)=>{
  // req.logout();
  req.session.destroy((err)=>{
    if(err)
    console.log("error destroying the session");
  });
  // if(!req.isAuthenticated())
    res.redirect('/chef_signin');
  // else
    // console.log("There is some error in if part");
});

/* Show chefs */
router.get('/showchefs',middleware.checkAuthentication,(req,res)=>{
  User.findOne({email:req.session.user},(err,ans)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/user_home");
    }
    if(ans.request[0])
    {
      req.flash("error","You can request only one chef at a time");
      res.redirect('/user_home');
    }
    else
    {
      Chef.find({check:false},(err,result)=>{
        if(err)
        {
        console.log(err);
        req.flash("error","some error occured");
        return res.redirect("/user_home");
        }
        if(result == '')
        res.render('user_home',{chef:result,disp:1});
        else
        res.render('user_home',{chef:result,disp:0});
      });
    }
  });

});

/* Updating user profile route */
router.get('/updateuser',middleware.checkAuthentication,(req,res)=>{
  User.findOne({email:req.session.user},(err,result)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/user_homepage");
    }
    res.render('updateuser',{list:result,disp:1});
  });
});

/* Cancel user request */
router.get('/cancel',middleware.checkAuthentication,(req,res)=>{
  User.findOne({email:req.session.user},(err, ans)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/user_home");
    }
    if(ans.request == "" )
    {
      // if there is not request to cancel
      req.flash("error","No request to cancel");
      res.redirect('/user_home');
    }
    else
    {
      Chef.findOneAndUpdate({email:ans.request[0].email},{request:"",check:false},(err,response)=>{
        if(err)
        {
        console.log(err);
        req.flash("error","some error occured");
        return res.redirect("/user_home");
        }
      });
      User.findOneAndUpdate({email:req.session.user},{request:'',check:false},(err,response)=>{
        if(err)
        {
        console.log(err);
        req.flash("error","some error occured");
        return res.redirect("/user_home");
        }
        req.flash("success","Cancelled the request sucessfully");
        res.redirect('/user_home');
      });
    }

  });

});

/* User requests */
router.get('/myrequest',middleware.checkAuthentication,(req,res)=>{
  User.findOne({email:req.session.user},(err,result)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/user_home");
    }
    
    let obj = result.request[0];
    if(obj == undefined)
    {
      return res.render('user_requests',{request:''});
    }
    obj.check = result.check;
    if(result.request[0]!='')
    res.render('user_requests',{request:obj});
    else
    res.render('user_requests',{request:''});
  });
});

/* Setting chef not available */
router.get('/notavailable',middleware.checkchefAuthentication,(req,res)=>{
  Chef.findOneAndUpdate({email:req.session.chef},{check:true},(err,response)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/chef_homepage");
    }
    req.flash("success","Status \"not available\" set successfully");
    res.redirect('/chef_homepage');
  });
});

/* Setting chef available */
router.get('/available',middleware.checkchefAuthentication,(req,res)=>{
  Chef.findOneAndUpdate({email:req.session.chef},{check:false},(err,response)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/chef_homepage");
    }
    req.flash("success","Status \"available\" set successfully");  
    res.redirect('/chef_homepage');
  });
});

/* Updating chef profile */
router.get('/update_chef',middleware.checkchefAuthentication,(req,res)=>{
  Chef.findOne({email:req.session.chef},(err,result)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/chef_homepage");
    }
    res.render('updatechef',{list:result,disp:1});
  });
});

/* Chef requests */
router.get('/chefrequest',middleware.checkchefAuthentication,(req,res)=>{
  Chef.findOne({email:req.session.chef},(err,result)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/chef_homepage");
    }
    let obj = result.request[0];
    if(obj == undefined)
    {
      return res.render('chef_requests',{request:''});
    }
    obj.check = result.check;
    if(result.request[0]!='')
    res.render('chef_requests',{request:obj});
    else
    res.render('chef_requests',{request:''});
  });
});

/* Accept the user request */
router.get('/accept',middleware.checkchefAuthentication,(req,res)=>{
  var obj = new Order({});
  Chef.findOne({email:req.session.chef},(err,ans)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/chef_homepage");
    }
    obj.user = ans.request; 
    if(ans.check == false)
    {
      User.findOne({email:ans.request[0].email},(err,result)=>{
        if(err)
        {
          req.flash("error","Some error occured");
          return res.redirect("/chef_homepage");
        }
        obj.chef = result.request;
        obj.save();
        });
      // if not false accept request code
      Chef.findOneAndUpdate({email:req.session.chef},{check:true},(err,result)=>{
        if(err)
        {
        console.log(err);
        req.flash("error","some error occured");
        return res.redirect("/chef_homepage");
        }
        const obj = result.request[0];
        User.findOneAndUpdate({email:obj.email},{check:true},(err,response)=>{
          if(err)
          {
          console.log(err);
          req.flash("error","some error occured");
          return res.redirect("/chef_homepage");
          }
        });
        req.flash("success","Accepted the request")
        res.redirect('/chef_homepage');
      });
    }
    else
    {
      // to allow only once
      req.flash("error","Request can be accepted only once");
      res.redirect('/chef_homepage');
    }
  })
});

/* Service done by user */
router.get('/servicedone',middleware.checkAuthentication,(req,res)=>{
  User.findOne({email:req.session.user},(err,result)=>{
    if(err)
    {
      console.log(err);
      req.flash("error","some error occured");
      res.redirect('/user_homepage');
    }
    const obj = result.request[0];
    Chef.findOneAndUpdate({email:obj.email},{request:'',check:false},(err,response)=>{
      if(err)
      {
        console.log(err);
        req.flash("error","some error occured");
        res.redirect('/user_homepage');
      }
    });
    User.findOneAndUpdate({email:result.email},{request:'',check:false},(err,ans)=>{
      if(err)
      {
        console.log(err);
        req.flash("error","some error occured");
        res.redirect('/user_homepage');
      }
    });
    req.flash("success","Thank you for using the service");
    res.redirect('/user_homepage');
  });
});

/* Admin logout */
router.get('/admin_homepage',(req,res,next)=>{
  res.render('admin_homepage');
});

/* list of orders */
router.get("/vieworders",(req,res)=>{
  Order.find({},(err,result)=>{
    if(err)
    {
      req.flash("error","Some error occured");
      console.log(err);
      return res.redirect('/admin_homepage');
    }
    console.log(result[0]);
    res.render("order",{order:result});
  });
});

router.get("/deletechef",(req,res)=>{
  res.render("deletechef");
});

router.get("/viewchefs",(req,res)=>{
  Chef.find({},(err,result)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect("/user_homepage");
    }
    if(result == '')
    res.render('chefview',{chef:result});
    else
    res.render('chefview',{chef:result});
  });
});

/* user Emergency */
router.get("/userEmergency",(req,res)=>{
  res.render("userEmergency");
});

/* chef Emergency */
router.get("/chefEmergency",(req,res)=>{
  res.render("chefEmergency");
});

// delete user 
router.get("/deleteuser",(req,res)=>{
  res.render("deleteuser");
});

// user expeirement
router.get("/user_home",(req,res)=>{
  res.render("user_home",{chef:'',disp:0});
});
/* --------------------------------------------------------------------------------------------------------------------------------------- 
//                                                            POST Methods
 --------------------------------------------------------------------------------------------------------------------------------------- */

 /* delete one chef */
 router.post("/deleteuser",(req,res)=>{
  User.findOneAndDelete({email:req.body.email},(err,result)=>{
    if(err)
    {
      req.flash("error","some error occured");
      return res.redirect("/user_homepage");
    }
    req.flash("success","Deleted sucessfully");
    req.session.destroy((err)=>{
      if(err)
      console.log("error destroying the session");
    });
    res.redirect("/");
  });
});

 /* delete one chef */
router.post("/deletechef",(req,res)=>{
  Chef.findOneAndDelete({email:req.body.email},(err,result)=>{
    if(err)
    {
      req.flash("error","some error occured");
      return res.redirect("/admin_homepage");
    }
    req.flash("success","Deleted chef sucessfully");
    res.redirect("/admin_homepage");
  });
});

 /* Update chef details */
router.post('/update_chef',(req,res)=>{
  // updating chef details to DB
  Chef.updateOne({email:req.session.chef},{$set : {username:req.body.username, mobile:req.body.mobile}},(err,response)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","Update error occured");
    return res.redirect('/chef_homepage');
    }
  });
  req.flash("success","updated details successfully");
  res.redirect('/chef_homepage');

});

/* Book a chef */
router.post('/bookchef',(req,res)=>{

  User.findOne({email:req.session.user},(err,result)=>{
    if(err)
    {
      console.log(err);
      req.flash("error","some error occured");
      return res.redirect('/user_homepage');
    }
    var requestobj = {
      username:result.username,
      mobile:result.mobile,
      email:result.email,
    };
    Chef.findOneAndUpdate({email:req.body.email},{request:requestobj},(err,response)=>{
      if(err)
      {
        console.log(err);
        req.flash("error","some error occured");
        return res.redirect('/user_homepage');
      }
    });

  });
  Chef.findOne({email:req.body.email},(err,result)=>{
    if(err)
    {
      console.log(err);
      req.flash("error","some error occured");
      return res.redirect('/user_homepage');
    }
    var requestobj = {
      username:result.username,
      mobile:result.mobile,
      email:result.email,
    };
    User.findOneAndUpdate({email:req.session.user},{request:requestobj},(err,response)=>{
      if(err)
      {
        console.log(err);
        req.flash("error","some error occured");
        return res.redirect('/user_homepage');
      }
    });
  });
  req.flash("success","Request sent to chef");
  res.redirect('/user_homepage');
});

/* Update user details */
router.post('/update_user',(req,res)=>{
 // updating user details to DB 
  User.updateOne({email:req.session.user},{$set : {username:req.body.username, mobile:req.body.mobile}},(err,response)=>{
    if(err)
    {
    console.log(err);
    req.flash("error","some error occured");
    return res.redirect('/user_homepage');
    }
  });
  req.flash("success","updated details successfully");
  res.redirect('/user_homepage');

});

 /* USER login */
router.post('/login_user',(req,res)=>{

  if(req.body.email == "admin@cheffood.com")
  {
    Admin.findOne({email:req.body.email},(err,result)=>{
      if(err)
      {
        req.flash("error",err.message);
        return res.redirect('/get_signin');
      }
      if(result == null)
      {
        // incorrect password
        req.flash("error", "No account with that mail exits");
        return res.redirect('/get_signin');
      }
      else
      {
      bcrypt.compare(req.body.password, result.password, function(err, response) {
        if(err)
        {
          console.log(err);
          req.flash("error","some error occured");
          return res.redirect("/get_signin");
        }
        if(response == true)
        {
          let redirectTo = req.session.redirectTo ? req.session.redirectTo : ('/admin_homepage');
          delete req.session.redirectTo;
          req.session.user = result.email;
          res.redirect(redirectTo);
        }
        else{
          // incorrect password
          req.flash("error","Password incorrect");
          return res.redirect('/get_signin');
        }
      });
    }

    });
    
  }
  else
  {
    User.findOne({email:req.body.email},(err,result)=>{
      if(err)
      {
        req.flash("error",err.message);
        return res.redirect('/get_signin');
      }
      // use bcrypt to check
      if(result == null)
      {
        // incorrect password
        req.flash("error", "No account with that mail exits");
        return res.redirect('/get_signin');
      }
      else
      {
      bcrypt.compare(req.body.password, result.password, function(err, response) {
        if(err)
        {
          req.flash("error","some error occured");
          return res.redirect('/get_signin');
        }
        if(response == true)
        {
          req.flash("success","welcome");

          let redirectTo = req.session.redirectTo ? req.session.redirectTo : ("/user_home")//('/user_homepage');
          delete req.session.redirectTo;
          req.session.user = result.email;
          res.redirect(redirectTo);
        }
        else{
          // incorrect password
          req.flash("error","Password incorrect");
          return res.redirect('/get_signin');
        }
      });
    }
    });

  }

});

 /* CHEF login */
router.post('/login_chef',(req,res)=>{

  Chef.findOne({email:req.body.email},(err,result)=>{
    if(err)
    {
      req.flash("error",err.message);
      return res.redirect('/get_chef_signin');
    }
    if(result == null)
    {
      // incorrect password
      req.flash("error", "No account with that mail exits");
      return res.redirect('/get_chef_signin');
    }
    else 
    {
    // use bycrypt to check
    bcrypt.compare(req.body.password, result.password, function(err, response) {
      if(err)
      {
        console.log(err);
        return res.redirect("/get_chef_signin");
      }
      if(response == true)
      {
        let redirectTo = req.session.redirectTo ? req.session.redirectTo : ('/chef_homepage');
        delete req.session.redirectTo;
        req.session.chef = result.email;
        res.redirect(redirectTo);
      }
      else{
        // incorrect password
        req.flash("error","Password incorrect");
        return res.redirect('/get_chef_signin');
      }
  });
}
  });

});

/* Signup page user */
 router.post('/signupuser',(req,res)=>{

  User.findOne({email:req.body.email},(err,result)=>{
     if(!result)
     {
       bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
         // Store hash in your password DB.
         var newUser3 = new User({
           username : req.body.username,
           email:req.body.email,
           mobile: req.body.mobile,
           role:process.env.USER,
           password:hash,
           check:false,
           request:[]
         });
         newUser3.save((err,answer)=>{
           if(err)
           {
             console.log(err);
             req.flash("error","Some error occured please try after some time");
             return res.redirect("/get_signup");
           }
         });
   
         // code to send mail to user after registeration
         var mail = newUser3.email;
         var mailOptions_user = {
           from: process.env.FROM_MAIL,
           to: mail,
           subject: 'Successfull registration',
           text: 'Welcome User',
           html: '<h2>Thank You For registering into The Chefs Food.</h2>'
         };
         transporter.sendMail(mailOptions_user, function(error, info){
           if (error) {
             console.log(error);
           } else {
             console.log('Email sent: ' + info.response);
           }
         });
       }); 
       req.flash("success","Welcome to chefs food");
       return res.redirect("/get_user_homepage");
     }
     else if(err)
     {
       // ask the user to try again
       req.flash("error",err.message);
       console.log(err);
       return res.redirect("/get_signup");
     }
     else
     {
       // that mail id already exists
       req.flash("error","That email id already exits please use another one");
       return res.redirect('/get_signup');
     }
    
  });

});

/* Signup page chef */
router.post('/signupchef',(req,res)=>{

  Chef.findOne({email:req.body.email},(err,result)=>{
    if(!result)
    {
      bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        // Store hash in your password DB.
        var newUser3 = new Chef({
          username : req.body.username,
          email:req.body.email,
          mobile: req.body.mobile,
          role:process.env.CHEF,
          password:hash,
          check:false,
          request:[]
        });
        newUser3.save((err,answer)=>{
          if(err)
          {
            req.flash("error","Some error occured please try after some time");
            return res.redirect("/get_chef_signup");
          }
          console.log(answer);
        });
        // code to send mail to chef after registration
        var mail = newUser3.email;
          var mailOptions_user = {
          from: process.env.FROM_MAIL,
          to: mail,
          subject: 'Successfull registration',
          text: 'Welcome Chef',
          html: '<h2>Hey new Chef , Thank You for registering into The chefs Food</h2>'
        };
        transporter.sendMail(mailOptions_user, function(error, info){
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response);
          }
        }); 
      });
      req.flash("success","Registered chef successfully");
      return res.redirect("/admin_homepage");
    }
    else if(err)
    {
      // ask the user to try again
      req.flash("error",err.message);
      console.log(err);
      return res.redirect("/admin_homepage");
    }
    else
    {
      // that mail id already exists
      req.flash("error","That email id already exits please use another one");
      return res.redirect('/admin_homepage');
    }
    
});

});



module.exports = router;
