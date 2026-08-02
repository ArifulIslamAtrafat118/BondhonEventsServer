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

// GET EXPIRED EVENTS
const getExpiredEvents = async(req,res)=>{
    try{
        const events = await eventsColl
            .find()
            .sort({date:-1})
            .toArray();

        const today = new Date();
        const expired = events.filter(
            event => new Date(event.date) < today
        );
        res.send(expired);
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
// Accepts any shape the client sends.
// New clients send: { ...fields, thumbnail: { url, public_id }, imageUrl: url }
// Old clients send: { ...fields, imageUrl: url }

const createEvent = async (req, res) => {

    try {

        const result = await eventsColl.insertOne(req.body);

        res.send(result);

    } catch (error) {

        res.status(500).send({ message: "Failed to create event." });

    }

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

const deleteEvent = async (req, res) => {

    const result = await eventsColl.deleteOne({
        _id: new ObjectId(req.params.id)
    });

    res.send(result);

}



// ADD EVENT MEDIA
// PUT /event/update/:eventId/media
// Body: { media: [{ url, public_id, type }] }
// Rules: owner only, max 5 total media files

const addEventMedia = async (req, res) => {

    try {

        const { eventId } = req.params;

        // Fetch the event to verify ownership and current media count
        const event = await eventsColl.findOne({
            _id: new ObjectId(eventId)
        });

        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        // Owner check
        if (event.author?.uid !== req.decoded.uid) {
            return res.status(403).json({ message: "Forbidden: not the event owner." });
        }

        const incomingMedia = req.body.media || [];

        if (!Array.isArray(incomingMedia) || incomingMedia.length === 0) {
            return res.status(400).json({ message: "No media provided." });
        }

        const existingMedia = Array.isArray(event.media) ? event.media : [];

        const combined = [...existingMedia, ...incomingMedia];

        if (combined.length > 5) {
            return res.status(400).json({
                message: `Maximum 5 media files allowed per event. Current: ${existingMedia.length}, trying to add: ${incomingMedia.length}.`
            });
        }

        const result = await eventsColl.updateOne(
            { _id: new ObjectId(eventId) },
            { $set: { media: combined } }
        );

        res.send(result);

    } catch (error) {

        console.error("addEventMedia error:", error);

        res.status(500).json({ message: "Failed to update event media." });

    }

}



// REMOVE EVENT MEDIA ITEM
// DELETE /event/update/:eventId/media/:publicId
// Removes a single media item by public_id (URL-encoded)

const removeEventMedia = async (req, res) => {

    try {

        const { eventId, publicId } = req.params;

        const decodedPublicId = decodeURIComponent(publicId);

        const event = await eventsColl.findOne({
            _id: new ObjectId(eventId)
        });

        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        if (event.author?.uid !== req.decoded.uid) {
            return res.status(403).json({ message: "Forbidden: not the event owner." });
        }

        const result = await eventsColl.updateOne(
            { _id: new ObjectId(eventId) },
            { $pull: { media: { public_id: decodedPublicId } } }
        );

        res.send(result);

    } catch (error) {

        console.error("removeEventMedia error:", error);

        res.status(500).json({ message: "Failed to remove media." });

    }

}



// JOIN FREE EVENT
const joinFreeEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID." });
    }

    const event = await eventsColl.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).send({ message: "Event not found." });
    }

    if (new Date(event.date) < new Date()) {
      return res.status(400).send({ message: "Cannot join an expired event." });
    }

    if (event.author?.uid === req.decoded.uid) {
      return res.status(400).send({ message: "Event author cannot join their own event." });
    }

    const fee = parseFloat(event.fee);
    if (!isNaN(fee) && fee > 0) {
      return res.status(400).send({ message: "This event requires a payment fee to join." });
    }

    if (Array.isArray(event.joined) && event.joined.includes(req.decoded.uid)) {
      return res.status(400).send({ message: "You have already joined this event." });
    }

    await eventsColl.updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { joined: req.decoded.uid } }
    );

    const updatedEvent = await eventsColl.findOne({ _id: new ObjectId(id) });
    res.send({ success: true, message: "Successfully joined event", joined: updatedEvent.joined });
  } catch (error) {
    console.error("joinFreeEvent error:", error);
    res.status(500).send({ message: "Failed to join event." });
  }
};

module.exports = {
    setCollection,
    getUpcomingEvents,
    getExpiredEvents,
    searchEvents,
    createEvent,
    getEventDetails,
    joinedEvents,
    manageEvents,
    updateEvent,
    deleteEvent,
    addEventMedia,
    removeEventMedia,
    joinFreeEvent,
}