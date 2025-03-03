import { Meteor } from "meteor/meteor";
import { Calls,Offers, ConnectedUsers } from "./calls";

Meteor.methods({
  async "calls.create"(doc){
    const callId = await Calls.insertAsync(doc);
    return callId;
  },
  async "calls.setOffer"(callId, offer) {
    Calls.updateAsync(callId, { $set: { offer } });
  },

  async "calls.setAnswer"(callId, answer) {
    Calls.updateAsync(callId, { $set: { answer } });
  },

  async "calls.addOfferCandidate"(callId, candidate) {
    // console.log(callId,candidate)
    Calls.updateAsync(callId, { $push: { offerCandidates: candidate } });
  },
  async "calls.addAnswerCandidate"(callId, candidate) {
    // console.log(callId,candidate)
    Calls.updateAsync(callId, { $push: { answerCandidates: candidate } });
  },
  async "calls.setOffersAnswerer"(callId,username){
    Calls.updateAsync(callId,{ $set: { answererUsername: username}})
  },
  async "calls.setAnswersOfferer"(callId,username){
    Calls.updateAsync(callId,{ $set: { offererUsername: username}})
  },
  async "calls.join"(callId,username){
    const call = await Calls.findOneAsync({ _id: callId });
    await Calls.updateAsync(
      { _id: callId },
      { $set: { answererUsername: username } }
    );
    console.log(`User ${username} joined call ${callId}`);

    return call.offer;
  },
  async "calls.getIceCandidates"(callId){
    const call = await Calls.findOneAsync({ _id: callId });
    return call.offerCandidates;
  },
  "connections.connect"(userName) {
    if (!this.connection) return;

    const socketId = this.connection.id;  // Meteor’s unique session ID
    console.log(`${userName} connected with socketId: ${socketId}`);

    ConnectedUsers.upsertAsync({ userName }, { 
        $set: { socketId, connectedAt: new Date() } 
    });

    return socketId;
},

"connections.disconnect"(userName) {
    console.log(`${userName} disconnected`);
    ConnectedUsers.removeAsync({ userName });
},

"connections.getSocketId"(userName) {
    const user = ConnectedUsers.findOne({ userName });
    return user ? user.socketId : null;
}

});
