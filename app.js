require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
// var passport = require("passport");
var flash = require('connect-flash');
var bodyParser = require('body-parser');
// LocalStrategy = require("passport-local").Strategy;
var MongoDBStore = require('connect-mongodb-session')(session);
var moment = require('moment');

// const User = require('./models/users');
// const Chef = require('./models/chefs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

// Sessions 
var sessionStore = new MongoDBStore({
  uri: 'mongodb://localhost/mp',
  collection: 'sessions'
  });
  // function(error)
  // {
  //   console.log(error);
  // });
  sessionStore.on('error', function(error) {
    // Also get an error here
    console.log(error);
  });

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: false}));
app.use(flash());
app.locals.moment = moment;

app.use(cookieParser());
app.use(session({
   secret: process.env.COOKIE_SCERET,
   resave: true,
   store: sessionStore,
   saveUninitialized: true,
   cookie:{ maxAge: 1000 * 60 * 60 * 24 } // 24 hrs
}));

// passport code
// app.use(passport.initialize());
// app.use(passport.session());

// passport.use('User',new LocalStrategy(User.authenticate()));
// passport.use('Chef',new LocalStrategy(Chef.authenticate()));

// passport.serializeUser(function(user, done) {
//   done(null, user);
// });

// passport.deserializeUser(function(u, done) {
//   if(u.role == 'chef')
//   {
//     Chef.findById(u._id,function(err, r){
//       done(err, r._id);
//     });
//   }
//   else
//   User.findById(u._id, function(err, user) {
//     done(err, user._id);
//   });
// });

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// passport.serializeUser(Chef.serializeUser());
// passport.deserializeUser(Chef.deserializeUser());

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const PORT = process.env.PORT || 5000 ;
app.listen(PORT, function () {
  console.log(`The Server Has Started! at port ${PORT}`);
});

module.exports = app;
