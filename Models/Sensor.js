const mongoose=require('mongoose');
const SensorsSchema= mongoose.Schema({
    name: {
        type : String
    },
    SensorIdentifier: {
        type : String,
        required : true
    },
    SensorType: {
        type : String,
        required : true
    },
    Description: {
        type : String,
    },
    SensorCoordinates: [Number]
    ,
    Created_date: {
        type : Date,
        default : Date.now()
    },
    data: []
});
module.exports=mongoose.model('Sensors',SensorsSchema);
