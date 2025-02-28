import { Meteor } from "meteor/meteor";
import { Calls } from "../imports/api/calls.js";
import "../imports/api/callsMethods.js";

Meteor.publish("availableOffers", function () {
  return Calls.find();
});

Meteor.publish("newOffer", function(callId){
  return Calls.find({ _id:callId }, { fields: { offer } });
})

Meteor.publish("newAnswer", function(callId){
  return Calls.find({ _id:callId }, { fields: { answer } });
})

Meteor.publish("offerCandidates", function (callId) {
  return Calls.find({ _id: callId }, { fields: { offerCandidates: 1 } });
});

Meteor.publish("answerCandidates", function (callId) {
  return Calls.find({ _id: callId }, { fields: { answerCandidates: 1 } });
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