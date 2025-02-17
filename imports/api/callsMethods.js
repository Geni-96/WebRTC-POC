import { Meteor } from "meteor/meteor";
import { Calls } from "./calls";

Meteor.methods({
    async "calls.create"() {  // ✅ Make the function async
        const callId = await Calls.insertAsync({
          offer: null,
          answer: null,
          createdAt: new Date(),
          offerCandidates: [],
          answerCandidates: [],
        });
    
        return callId; // ✅ Ensure this is correct
      },     

  async "calls.setOffer"(callId, offer) {
    Calls.updateAsync(callId, { $set: { offer } });
  },

  async "calls.setAnswer"(callId, answer) {
    Calls.updateAsync(callId, { $set: { answer } });
  },

  async "calls.addOfferCandidate"(callId, candidate) {
    Calls.updateAsync(callId, { $push: { offerCandidates: candidate } });
  },

  async "calls.addAnswerCandidate"(callId, candidate) {
    Calls.updateAsync(callId, { $push: { answerCandidates: candidate } });
  },

  async "calls.hangup"(callId) {
    Calls.removeAsync(callId);
  },
});
