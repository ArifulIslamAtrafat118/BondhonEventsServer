const { ObjectId } = require("mongodb");
const { updateUserStatistics } = require("./user.controller");

let eventsColl;

const setCollection = (db) => {
  eventsColl = db.collection("events");
};

// GET UPCOMING EVENTS
const getUpcomingEvents = async (req, res) => {
  try {
    const events = await eventsColl.find().sort({ date: 1 }).toArray();
    const today = new Date();
    const upcoming = events.filter((event) => new Date(event.date) >= today);
    res.send(upcoming);
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// GET EXPIRED EVENTS
const getExpiredEvents = async (req, res) => {
  try {
    const events = await eventsColl.find().sort({ date: -1 }).toArray();
    const today = new Date();
    const expired = events.filter((event) => new Date(event.date) < today);
    res.send(expired);
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// SEARCH EVENTS
const searchEvents = async (req, res) => {
  try {
    const search = req.query.search?.toLowerCase();

    const result = await eventsColl
      .find({
        title: {
          $regex: search,
          $options: "i",
        },
      })
      .sort({ date: 1 })
      .toArray();

    const today = new Date();
    const upcoming = result.filter((event) => new Date(event.date) >= today);

    res.send(upcoming);
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

// CREATE EVENT
const createEvent = async (req, res) => {
  try {
    const result = await eventsColl.insertOne(req.body);

    if (req.decoded?.uid) {
      await updateUserStatistics(req.decoded.uid, { eventsCreated: 1 });
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to create event." });
  }
};

// EVENT DETAILS
const getEventDetails = async (req, res) => {
  try {
    const result = await eventsColl.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch event details." });
  }
};

// JOINED EVENTS
const joinedEvents = async (req, res) => {
  try {
    const result = await eventsColl
      .find({
        joined: req.params.uid,
      })
      .sort({ date: 1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch joined events." });
  }
};

// MANAGE EVENTS
const manageEvents = async (req, res) => {
  try {
    const result = await eventsColl
      .find({
        "author.uid": req.params.uid,
      })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch managed events." });
  }
};

// UPDATE EVENT
const updateEvent = async (req, res) => {
  try {
    const updateFields = { ...req.body };
    delete updateFields._id;

    const result = await eventsColl.updateOne(
      {
        _id: new ObjectId(req.params.id),
      },
      {
        $set: updateFields,
      }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update event." });
  }
};

// DELETE EVENT
const deleteEvent = async (req, res) => {
  try {
    const event = await eventsColl.findOne({
      _id: new ObjectId(req.params.id),
    });

    const result = await eventsColl.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (event?.author?.uid) {
      await updateUserStatistics(event.author.uid, { eventsCreated: -1 });
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete event." });
  }
};

// ADD EVENT MEDIA
const addEventMedia = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await eventsColl.findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

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
        message: `Maximum 5 media files allowed per event. Current: ${existingMedia.length}, trying to add: ${incomingMedia.length}.`,
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
};

// REMOVE EVENT MEDIA ITEM
const removeEventMedia = async (req, res) => {
  try {
    const { eventId, publicId } = req.params;
    const decodedPublicId = decodeURIComponent(publicId);

    const event = await eventsColl.findOne({
      _id: new ObjectId(eventId),
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
};

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

    await updateUserStatistics(req.decoded.uid, { eventsJoined: 1 });

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
};