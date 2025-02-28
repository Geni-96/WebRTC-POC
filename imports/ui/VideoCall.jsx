import React, { useEffect, useRef, useState } from "react";
import { Meteor } from "meteor/meteor";
import { Calls } from "../api/calls";
import { useTracker } from "meteor/react-meteor-data";

// Signaling servers
const servers = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
// const pc = new RTCPeerConnection(servers);

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


  const fetchUserMedia = ()=>{
    return new Promise(async(resolve, reject)=>{
        try{
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                // audio: true,
            });
            localVideoRef.current.srcObject = stream;
            setLocalStream(stream);
            resolve();    
        }catch(err){
            console.log(err);
            reject()
        }
    })
}
const createPeerConnection = (id, offerObj)=>{
  return new Promise(async(resolve, reject)=>{
      //RTCPeerConnection is the thing that creates the connection
      //we can pass a config object, and that config object can contain stun servers
      //which will fetch us ICE candidates
      setPc(await new RTCPeerConnection(servers));
      setRemoteStream(new MediaStream());
      remoteVideoRef.current.srcObject = remoteStream;


      localStream.getTracks().forEach(track=>{
          //add localtracks so that they can be sent once the connection is established
          pc.addTrack(track,localStream);
      })

      pc.addEventListener("signalingstatechange", (event) => {
          console.log(event);
          console.log(pc.signalingState)
      });

      pc.onicecandidate = async(event) => {
        if (event.candidate) {
          await Meteor.callAsync("calls.addOfferCandidate", id, event.candidate.toJSON());
        }
      };
      
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      if(offerObj){
        await pc.setRemoteDescription(offerObj.offer);
      }
      resolve();
  })
}


  const createCall = async (offerObj) => {
    setWebcamActive(true);
    const pc = new RTCPeerConnection(servers);    
    const id = await Meteor.callAsync("calls.create", {
      offer: null,
      answer: null,
      createdAt: new Date(),
      offerCandidates: [],
      answerCandidates: [],
    });
    setCallId(id);
    await fetchUserMedia();
    
    await createPeerConnection(id,null);
    
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await Meteor.callAsync("calls.setOffer", id, offer);
    setDidIOffer(true);

  };
  


  const answerCall = async (offerObj) => {
    if (!offerObj) {
      alert("No offer found!");
      return;
    }
    const id = await Meteor.callAsync("calls.create", {
      offer: offerObj,
      answer: null,
      createdAt: new Date(),
      offerCandidates: [],
      answerCandidates: [],
    });
    setCallId(id);
    await fetchUserMedia();
    await createPeerConnection(id, offerObj);
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);
    
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        Meteor.callAsync("calls.addAnswerCandidate", id, event.candidate.toJSON());
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offerObj));


    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await Meteor.callAsync("calls.setAnswer", offerObj.answer);
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
        <button onClick={createCall} disabled={!webcamActive}>
          Create Call
        </button>
        <button onClick={() => setShowInput(!showInput)} disabled={!webcamActive}>
          {showInput ? "Hide Input" : "Join Call"}
        </button>
        {showInput && (
          <input
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
            placeholder="Enter Call ID"
            onKeyDown={(e) => e.key === "Enter" && answerCall()}
          />
        )}
        <button onClick={() => Meteor.callAsync("calls.hangup", callId)} disabled={!webcamActive || !callId}>
          Hangup
        </button>
      </div>
    </div>
  );
}
