const express = require('express');
const mongoose = require('mongoose');
const passport = require("passport");
const nodemailer = require('nodemailer');
const { locals } = require('../app');
const router = express.Router();

const User = require('../models/users');
const Chef = require('../models/chefs');


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
router.get('/user_homepage',(req,res,next)=>{
  res.render('user_homepage');
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
router.get('/chef_homepage',(req,res,next)=>{
  res.render('chef_homepage');
});

/* USER Logout */
router.get('/user_logout',function(req,res){
  req.logout();
  if(!req.isAuthenticated())
    res.redirect('/signin');
  else
  console.log("There is some error in if part");
});

/* CHEF logout */
router.get('/chef_logout',(req,res,next)=>{
  req.logout();
  if(!req.isAuthenticated())
    res.redirect('/chef_signin');
  else
    console.log("There is some error in if part");
});

/* --------------------------------------------------------------------------------------------------------------------------------------- 
//                                                            POST Methods
 --------------------------------------------------------------------------------------------------------------------------------------- */

 /* USER login */
router.post("/login_user", (req, res, next) => {
  passport.authenticate("User", (err, user, info) => {
      if (err) {
          return next(err);
      }
      if (!user) {
          req.flash("error", info.message);
          return res.redirect('/get_signin');
      }
      req.logIn(user, err => {
          if (err) {
              return next(err);
          }
            let redirectTo = req.session.redirectTo ? req.session.redirectTo : ('/user_homepage');
            delete req.session.redirectTo;
            res.redirect(redirectTo);
      });
  })(req, res, next);
});


 /* CHEF login */
 router.post("/login_chef", (req, res, next) => {
  passport.authenticate("Chef", (err, user, info) => {
      if (err) {
          return next(err);
      }
      if (!user) {
          req.flash("error", info.message);
          return res.redirect('/get_chef_signin');
      }
      req.logIn(user, err => {
          if (err) {
              return next(err);
          }
            let redirectTo = req.session.redirectTo ? req.session.redirectTo : ('/chef_homepage');
            delete req.session.redirectTo;
            res.redirect(redirectTo);
      });
  })(req, res, next);
});


/* POST method for signup page user */
router.post('/signupuser',function(req,res,next){
  var newUser3 = new User({
    username : req.body.username,
    email:req.body.email,
    mobile: req.body.mobile,
    role:process.env.USER
  });
  User.register(newUser3, req.body.password, (err, user) => {
    if (err) {
        if (err.email === 'MongoError' && err.code === 11000) {
            // Duplicate email
            req.flash("error", "That email has already been registered.");
            console.log(err);
            return res.redirect('/get_signup');
        }
        // Some other error
        req.flash("error",err.message);
        console.log(err);
        return res.redirect("/get_signup");
    }
    passport.authenticate("User")(req, res, () => {
        req.flash("success", "Successfully Logged In " + user.username);
        console.log(newUser3);
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
        res.redirect("/user_homepage");
    });
  });
});

/* POST method for signup page chef*/
router.post('/signupchef',function(req,res,next){
  var newUser3 = new Chef({
    username : req.body.username,
    email:req.body.email,
    mobile: req.body.mobile,
    role:process.env.CHEF
  });
  Chef.register(newUser3, req.body.password, (err, user) => {
    if (err) {
        if (err.email === 'MongoError' && err.code === 11000) {
            // Duplicate email
            req.flash("error", "That email has already been registered.");
            console.log(err);
            return res.redirect('/get_chef_signup');
        }
        // Some other error
        req.flash("error",err.message);
        console.log(err);
        return res.redirect("/get_chef_signup");
    }
    passport.authenticate("Chef")(req, res, () => {
        req.flash("success", "Successfully Logged In " + user.username);
        console.log(newUser3);
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
        // change this
        res.redirect("/chef_homepage");
    });
  });
});

module.exports = router;
