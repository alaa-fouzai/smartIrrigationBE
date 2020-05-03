const mongoose=require('mongoose');

const UserSchema = mongoose.Schema(
    {
        FirstName: {
            type : String,
            required : true
        },
        LastName: {
            type : String,
            required : true
        },
        email: {
            type : String,
            required : true
        },
        password: {
            type : String,
            required : true
        },
        enabled: {
            type : Number,
            required : true
        },
        Created_date: {
            type : Date,
            default : Date.now()
        },
        Location_ids: [mongoose.Schema.Types.ObjectId]
        ,
    }
);

module.exports=mongoose.model('User',UserSchema);
