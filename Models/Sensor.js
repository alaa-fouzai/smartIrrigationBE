const mongoose=require('mongoose');
const SensorsSchema= mongoose.Schema({
    name: {
        type : String,
        required : true
    },
    SensorIdentifier: {
        type : String,
    },
    SensorType: {
        type : String,
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
