import React, { useEffect, useRef, useState } from "react";
import { Meteor } from "meteor/meteor";
import { Calls,Offers } from "../api/calls";
import { useTracker,useSubscribe } from "meteor/react-meteor-data";

// Signaling servers
const servers = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  ],
  iceCandidatePoolSize: 10,
};



export default function VideoCall() {
  const [callId, setCallId] = useState("");
  const [webcamActive, setWebcamActive] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [didIOffer, setDidIOffer]= useState(false);
  const [localStream,setLocalStream] = useState(null);
  const [remoteStream,setRemoteStream] = useState(null);
  const [pc,setPc] = useState(null);
  const username = Math.floor(Math.random()*1000000);

  //subscribe to changes in calldata
  const isSubscribed = useSubscribe("callData", callId);

  // Track changes in the Calls collection
  const call = useTracker(() => {
    // Wait for the subscription to be ready before querying the collection
    if (isSubscribed()) {
      return Calls.findOne({ _id: callId });
    }
    return null; // Return null until the subscription is ready
  }, [callId]);
  console.log(call,'subscribed call data');
  // useEffect(() => {
  //   if(call?.answer){
  //     pc.addIceCandidate()
  //   }
  // }, [callId]);

  const fetchUserMedia = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        localVideoRef.current.srcObject = stream;
        return stream;  // Return the stream instead of waiting for state update
    } catch (err) {
        console.error("Error fetching media", err);
        throw err;
    }
};

const createPeerConnection = async(callId)=>{
  try {
    const pc = await new RTCPeerConnection(servers);
      setRemoteStream(new MediaStream());
      remoteVideoRef.current.srcObject = remoteStream;
    //   localStream.getTracks().forEach(track=>{
    //     //add localtracks so that they can be sent once the connection is established
    //     pc.addTrack(track,localStream);
    // })

      pc.addEventListener("signalingstatechange", (event) => {
          console.log(event);
          console.log(pc.signalingState)
      });

      pc.onicecandidate = async(event) => {
        
        if (event.candidate) {
          await Meteor.callAsync("calls.addOfferCandidate",callId, event.candidate.toJSON());
        }
      };
      
      pc.ontrack = (event) => {
        console.log('got a track from another user',event)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log('add remote stream')
        }
      };
      return pc;
  } catch (error) {
    console.log(error);
  }
}

const createPeerConnectionAnswer = async(callId,offerObj)=>{
  try {
    const pc = await new RTCPeerConnection(servers);
      setRemoteStream(new MediaStream());
      remoteVideoRef.current.srcObject = remoteStream;
      console.log('callid',callId,'offerobj',offerObj,'pc',pc)
    //   localStream.getTracks().forEach(track=>{
    //     //add localtracks so that they can be sent once the connection is established
    //     pc.addTrack(track,localStream);
    // })

      pc.addEventListener("signalingstatechange", (event) => {
          console.log(event);
          console.log(pc.signalingState)
      });

      pc.onicecandidate = async(event) => {
        
        if (event.candidate) {
          await Meteor.callAsync("calls.addAnswerCandidate",callId, event.candidate.toJSON());
        }
      };
      
      pc.ontrack = (event) => {
        console.log('got a track from another user',event)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log('add remote stream')
        }
      };

      if(offerObj){
        await pc.setRemoteDescription(offerObj);
      }
      return pc;
  } catch (error) {
    console.log(error);
  }
}

  const createCall = async (offerObj) => {
    setWebcamActive(true);
    // setPc(new RTCPeerConnection(servers));    
    const callId = await Meteor.callAsync("calls.create",{
      offer: null,
      answer: null,
      offererUsername: username,
      answererUsername:null,
      offerCandidates: [],
      answerCandidates: [],
    });
    console.log('callId', callId)
    setCallId(callId);
    const stream = await fetchUserMedia();
    setLocalStream(stream);
    
    // console.log(localStream);
    
    const pc = await createPeerConnection(callId);
    setPc(pc);
    // console.log(pc)
    stream.getTracks().forEach(track=>{
      //add localtracks so that they can be sent once the connection is established
      pc.addTrack(track,stream);
  })
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    setDidIOffer(true);
    console.log('offer created',offer);

    await Meteor.callAsync("calls.setOffer", callId, offer);
    setDidIOffer(true);
    console.log(Calls.findOneAsync({_id:callId}))

  };
  


  const answerCall = async (callId) => {
    console.log('callid in answercall', callId)
    const offer = await Meteor.callAsync("calls.join", callId, username);
    // console.log('offer found',offer);
    const answererCallId = await Meteor.callAsync("calls.create",{
      offer: offer,
      answer: null,
      offererUsername: null,
      answererUsername:username,
      offerCandidates: [],
      answerCandidates: [],
    });
    await Meteor.callAsync("calls.setOffersAnswerer",answererCallId,username)
    // await Meteor.callAsync("calls.setAnswersofferer",callId,username)
    // console.log(answererCallId);
    const stream = await fetchUserMedia();
    setLocalStream(stream)
    // console.log('answer stream',stream);
    const pc = await createPeerConnectionAnswer(answererCallId,offer);
    setPc(pc);
    console.log('answer pc',pc)
    stream.getTracks().forEach(track=>{
      //add localtracks so that they can be sent once the connection is established
      pc.addTrack(track,stream);
    })
    const answer = await pc.createAnswer({})
    await pc.setLocalDescription(answer);
    console.log('printing offer and answer',offer,answer)
    
    await Meteor.callAsync("calls.setAnswer",answererCallId,answer)
    await Meteor.callAsync("calls.setAnswer",callId,answer)

    const offererIceCandidates = await Meteor.callAsync("calls.getIceCandidates",callId);
    offererIceCandidates.forEach(async(candidate)=>{
      await Meteor.callAsync("calls.addOfferCandidate",answererCallId,candidate);
      pc.addIceCandidate(candidate);
    })
    const answererIceCandidates = await Meteor.callAsync("calls.getIceCandidates",answererCallId);
    answererIceCandidates.forEach(async(candidate)=>{
      await Meteor.callAsync("calls.addAnswerCandidate",callId,candidate);
    })
    // // const callId = await Meteor.callAsync("calls.create",username);
    // setCallId(callId)
    // const stream = await fetchUserMedia();
    // setLocalStream(stream);
    // const pc = await createPeerConnection(callId,offerObj);
    // const answer = await pc.createAnswer({});
    // await pc.setLocalDescription(answer);
    // console.log(offerObj);
    // console.log(answer);
    // offerObj.answer = answer;
    
  };

  return (
    <div className="container">
      <div className="videos">
        <span>
          <h3>Local Stream</h3>
          <video ref={localVideoRef} autoPlay playsInline></video>
        </span>
        <span>
          <h3>Remote Stream</h3>
          <video ref={remoteVideoRef} autoPlay playsInline></video>
        </span>
      </div>
      <div className="buttons">
        <button onClick={createCall}>
          Create Call
        </button>
        <button onClick={() => setShowInput(!showInput)}>
          {showInput ? "Hide Input" : "Join Call"}
        </button>
        {showInput && (
          <input
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
            placeholder="Enter Call ID"
            onKeyDown={(e) => e.key === "Enter" && answerCall(e.target.value)}
          />
        )}
        <button onClick={() => Meteor.callAsync("calls.hangup", callId)} disabled={!webcamActive || !callId}>
          Hangup
        </button>
      </div>
    </div>
  );
}
