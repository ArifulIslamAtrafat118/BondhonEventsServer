const { ObjectId } = require("mongodb");
const stripe = require("../config/stripe");

let eventsColl;
let paymentsColl;

const SUPER_ADMIN_UID = "Jt5CbqrVy3QXN6cMMU0PzYmvVwN2";
const SUPER_ADMIN_EMAIL = "arafatarifulislam611@gmail.com";

const setCollection = (db) => {
  eventsColl = db.collection("events");
  paymentsColl = db.collection("payments");
};

// POST /payments/create-payment-intent
const createPaymentIntent = async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).send({ message: "Event ID is required." });
    }

    const event = await eventsColl.findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).send({ message: "Event not found." });
    }

    // Validation 1: Event not expired
    if (new Date(event.date) < new Date()) {
      return res.status(400).send({ message: "Cannot join an expired event." });
    }

    // Validation 2: Author cannot join their own event
    if (event.author?.uid === req.decoded.uid) {
      return res.status(400).send({ message: "Event author cannot join their own event." });
    }

    // Validation 3: Prevent duplicate joins
    if (Array.isArray(event.joined) && event.joined.includes(req.decoded.uid)) {
      return res.status(400).send({ message: "You have already joined this event." });
    }

    // Validation 4: Fee check
    const fee = parseFloat(event.fee);
    if (isNaN(fee) || fee <= 0) {
      return res.status(400).send({ message: "This event does not have a joining fee." });
    }

    const amountInCents = Math.round(fee * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        eventId: event._id.toString(),
        userId: req.decoded.uid,
        userEmail: req.decoded.email || "",
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("createPaymentIntent error:", error);
    res.status(500).send({ message: error.message || "Failed to create payment intent." });
  }
};

// POST /payments/confirm
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, eventId } = req.body;
    if (!paymentIntentId || !eventId) {
      return res.status(400).send({ message: "paymentIntentId and eventId are required." });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      return res.status(400).send({ message: "Payment confirmation failed or incomplete." });
    }

    // Verify metadata
    if (
      paymentIntent.metadata.eventId !== eventId ||
      paymentIntent.metadata.userId !== req.decoded.uid
    ) {
      return res.status(400).send({ message: "Payment metadata mismatch." });
    }

    const event = await eventsColl.findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).send({ message: "Event not found." });
    }

    // Check if payment record already created
    const existingPayment = await paymentsColl.findOne({ paymentIntentId: paymentIntent.id });
    if (!existingPayment) {
      // Create payment document
      const paymentRecord = {
        eventId: new ObjectId(eventId),
        paymentIntentId: paymentIntent.id,
        transactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        paidAt: new Date(),
        eventTitle: event.title,
        participant: {
          uid: req.decoded.uid,
          name: req.decoded.name || req.decoded.email?.split("@")[0] || "Participant",
          email: req.decoded.email,
        },
        organizer: {
          uid: event.author?.uid || "",
          name: event.author?.name || "Organizer",
          email: event.author?.email || "",
        },
        paymentMethod: paymentIntent.payment_method_types?.[0] || "card",
        status: paymentIntent.status,
      };

      await paymentsColl.insertOne(paymentRecord);
    }

    // Add user to event's joined array atomically
    await eventsColl.updateOne(
      { _id: new ObjectId(eventId) },
      { $addToSet: { joined: req.decoded.uid } }
    );

    res.send({
      success: true,
      message: "Payment successful! You have joined the event.",
    });
  } catch (error) {
    console.error("confirmPayment error:", error);
    res.status(500).send({ message: error.message || "Failed to confirm payment." });
  }
};

// GET /payments/event/:eventId
const getEventPaymentHistory = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!ObjectId.isValid(eventId)) {
      return res.status(400).send({ message: "Invalid Event ID." });
    }

    const event = await eventsColl.findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).send({ message: "Event not found." });
    }

    const isAuthor = event.author?.uid === req.decoded.uid;
    const isSuperAdmin =
      req.decoded.uid === SUPER_ADMIN_UID || req.decoded.email === SUPER_ADMIN_EMAIL;

    if (!isAuthor && !isSuperAdmin) {
      return res.status(403).send({
        message: "Forbidden Access: Only event organizer or Super Admin can view payment history.",
      });
    }

    const payments = await paymentsColl
      .find({ eventId: new ObjectId(eventId) })
      .sort({ paidAt: -1 })
      .toArray();

    res.send(payments);
  } catch (error) {
    console.error("getEventPaymentHistory error:", error);
    res.status(500).send({ message: "Failed to fetch payment history." });
  }
};

module.exports = {
  setCollection,
  createPaymentIntent,
  confirmPayment,
  getEventPaymentHistory,
};
