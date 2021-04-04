var mongoose = require('mongoose');
var schema = mongoose.Schema;
// var passportLocalMongoose = require("passport-local-mongoose");

var chefSchema = new schema({
    username:{
        type:String,
        required:true,
        unique:true,
    },
    role:{
        type:String,
        required:true
    },
    mobile:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,   
    request:[{
        username:String,
        mobile:String,
        email:String,
        experience:String,
    }],
    check:{
        type:Boolean,
    }
    
})
// chefSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('chef',chefSchema);
