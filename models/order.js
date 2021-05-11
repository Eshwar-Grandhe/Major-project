var mongoose = require('mongoose');
var schema = mongoose.Schema;

var orderSchema = new schema({
 
    user:[{
        username:String,
        mobile:String,
        email:String,
        experience:String,
    }],
    chef:[{
        username:String,
        mobile:String,
        email:String,
        experience:String,
    }],
    savedAt:{
        type:Date,
        default:Date.now()
    },
    
})

module.exports = mongoose.model('order',orderSchema);
