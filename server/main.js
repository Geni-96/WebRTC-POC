import { Meteor } from "meteor/meteor";
import { Calls,Offers } from "../imports/api/calls.js";
import "../imports/api/callsMethods.js";


Meteor.publish("callData", function (callId) {
  check(callId, String);
  return Calls.find({ _id: callId });
});


//on connection get all available offers and call createOfferEls
// socket.on('availableOffers',offers=>{
//   console.log(offers)
//   createOfferEls(offers)
// })

// //someone just made a new offer and we're already here - call createOfferEls
// socket.on('newOfferAwaiting',offers=>{
//   createOfferEls(offers)
// })

// socket.on('answerResponse',offerObj=>{
//   console.log(offerObj)
//   addAnswer(offerObj)
// })

// socket.on('receivedIceCandidateFromServer',iceCandidate=>{
//   addNewIceCandidate(iceCandidate)
//   console.log(iceCandidate)
// })