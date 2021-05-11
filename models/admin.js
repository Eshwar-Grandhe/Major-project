var mongoose = require('mongoose');
var schema = mongoose.Schema;

var adminSchema = new schema({
    username:{
        type:String,
        required:true,
        unique:true,
    },
    email:{
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
    password:{
        type:String
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,   

    
})

module.exports = mongoose.model('admin',adminSchema);
