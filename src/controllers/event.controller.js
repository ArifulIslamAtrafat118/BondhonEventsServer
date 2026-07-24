const {ObjectId}=require("mongodb");


let eventsColl;



const setCollection=(db)=>{
    eventsColl=db.collection("events");
}



// GET UPCOMING EVENTS
const getUpcomingEvents = async(req,res)=>{

    try{

        const events=await eventsColl
        .find()
        .sort({date:1})
        .toArray();


        const today=new Date();


        const upcoming=events.filter(
            event=>new Date(event.date)>=today
        );


        res.send(upcoming);

    }
    catch(error){

        res.status(500).send({
            error:"Internal Server Error"
        });

    }

}



// SEARCH EVENTS

const searchEvents=async(req,res)=>{

    try{

        const search=req.query.search?.toLowerCase();


        const result=await eventsColl
        .find({
            title:{
                $regex:search,
                $options:"i"
            }
        })
        .sort({date:1})
        .toArray();



        const today=new Date();


        const upcoming=result.filter(
            event=>new Date(event.date)>=today
        );


        res.send(upcoming);


    }
    catch(error){

        res.status(500).send({
            message:"Internal Server Error"
        });
    }

}



// CREATE EVENT

const createEvent=async(req,res)=>{

    const result=await eventsColl.insertOne(req.body);

    res.send(result);

}




// EVENT DETAILS

const getEventDetails=async(req,res)=>{

    const result=await eventsColl.findOne({
        _id:new ObjectId(req.params.id)
    });


    res.send(result);

}




// JOINED EVENTS

const joinedEvents=async(req,res)=>{


    const result=await eventsColl
    .find({
        joined:req.params.uid
    })
    .sort({date:1})
    .toArray();


    res.send(result);

}





// MANAGE EVENTS

const manageEvents=async(req,res)=>{


    const result=await eventsColl
    .find({
        "author.uid":req.params.uid
    })
    .toArray();


    res.send(result);

}




// UPDATE EVENT

const updateEvent=async(req,res)=>{


    const updateFields={...req.body};

    delete updateFields._id;


    const result=await eventsColl.updateOne(
        {
            _id:new ObjectId(req.params.id)
        },
        {
            $set:updateFields
        }
    );


    res.send(result);

}




// DELETE EVENT

const deleteEvent=async(req,res)=>{


    const result=await eventsColl.deleteOne({
        _id:new ObjectId(req.params.id)
    });


    res.send(result);

}



module.exports={
    setCollection,
    getUpcomingEvents,
    searchEvents,
    createEvent,
    getEventDetails,
    joinedEvents,
    manageEvents,
    updateEvent,
    deleteEvent
}