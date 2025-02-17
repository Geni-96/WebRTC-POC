import { Meteor } from "meteor/meteor";
import { Calls } from "../imports/api/calls.js";
import "../imports/api/callsMethods.js";

Meteor.publish("calls", function () {
  return Calls.find();
});

Meteor.publish("offerCandidates", function (callId) {
  return Calls.find({ _id: callId }, { fields: { offerCandidates: 1 } });
});

Meteor.publish("answerCandidates", function (callId) {
  return Calls.find({ _id: callId }, { fields: { answerCandidates: 1 } });
});
