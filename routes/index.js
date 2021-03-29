const express = require('express');
const mongoose = require('mongoose');
const passport = require("passport");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { locals } = require('../app');

const router = express.Router();

const User = require('../models/users');
const Chef = require('../models/chefs');
const { session } = require('passport');
const { Session } = require('express-session');


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
  console.log(req.session.user);
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
  req.session.destroy((err)=>{
    if(err)
    console.log("error destroying the session");
  });
  if(!req.isAuthenticated())
    res.redirect('/signin');
  else
  console.log("There is some error in if part");
});

/* CHEF logout */
router.get('/chef_logout',(req,res,next)=>{
  req.logout();
  req.session.destroy((err)=>{
    if(err)
    console.log("error destroying the session");
  });
  if(!req.isAuthenticated())
    res.redirect('/chef_signin');
  else
    console.log("There is some error in if part");
});

/* --------------------------------------------------------------------------------------------------------------------------------------- 
//                                                            POST Methods
 --------------------------------------------------------------------------------------------------------------------------------------- */

 /* USER login */
router.post('/login_user',(req,res)=>{
    User.findOne({email:req.body.email},(err,result)=>{
      if(err)
      {
        req.flash("error",err.message);
        return res.redirect('/get_signin');
      }
      bcrypt.compare(req.body.password, result.password, function(err, response) {
        if(response == true)
        {
          let redirectTo = req.session.redirectTo ? req.session.redirectTo : ('/user_homepage');
          delete req.session.redirectTo;
          req.session.user = result.email;
          res.redirect(redirectTo);
        }
        else{
          req.flash("error","Password incorrect");
          return res.redirect('/get_signin');
        }
    });

    });
});

 /* CHEF login */
router.post('/login_chef',(req,res)=>{

  Chef.findOne({email:req.body.email},(err,result)=>{
    if(err)
    {
      req.flash("error",err.message);
      return res.redirect('/get_chef_signin');
    }
    bcrypt.compare(req.body.password, result.password, function(err, response) {
      if(response == true)
      {
        let redirectTo = req.session.redirectTo ? req.session.redirectTo : ('/chef_homepage');
        delete req.session.redirectTo;
        req.session.chef = result.email;
        res.redirect(redirectTo);
      }
      else{
        req.flash("error","Password incorrect");
        return res.redirect('/get_chef_signin');
      }
  });

  });

})

/* POST method for signup page user */
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
        });
        newUser3.save((err,answer)=>{
          if(err)
          {
            req.flash("error","Some error occured please try after some time");
            return res.redirect("/get_signup");
          }
          console.log(answer);
        });
    
      });
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

      return res.redirect("/user_homepage");
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

/* POST method for signup page chef*/
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
          password:hash
        });
        newUser3.save((err,answer)=>{
          if(err)
          {
            req.flash("error","Some error occured please try after some time");
            return res.redirect("/get_chef_signup");
          }
          console.log(answer);
        });
    
      });
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
      return res.redirect("/chef_homepage");
    }
    else if(err)
    {
      // ask the user to try again
      req.flash("error",err.message);
      console.log(err);
      return res.redirect("/get_chef_signup");
    }
    else
    {
      // that mail id already exists
      req.flash("error","That email id already exits please use another one");
      return res.redirect('/get_chef_signup');
    }
    
});

});



module.exports = router;
