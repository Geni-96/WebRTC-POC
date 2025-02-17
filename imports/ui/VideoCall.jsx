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
const pc = new RTCPeerConnection(servers);

export default function VideoCall() {
  const [callId, setCallId] = useState("");
  const [webcamActive, setWebcamActive] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Subscribe to the call
  const call = useTracker(() => Calls.findOne({ _id: callId }), [callId]);

  useEffect(() => {
    if (call?.answer && !pc.currentRemoteDescription) {
      pc.setRemoteDescription(new RTCSessionDescription(call.answer));
    }

    if (call?.answerCandidates) {
      call.answerCandidates.forEach((candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
    }
  }, [call]);

  const startWebcam = async () => {
    setWebcamActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  };
  

  const createCall = async () => {
    // Create an empty call and get the ID
    const id = await Meteor.callAsync("calls.create");
    setCallId(id);

    pc.onicecandidate = async(event) => {
      if (event.candidate) {
        await Meteor.callAsync("calls.addOfferCandidate", id, event.candidate.toJSON());
      }
    };

    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await Meteor.callAsync("calls.setOffer", id, offer);

    Meteor.subscribe("answerCandidates", id);
  };

  const answerCall = async () => {
    const call = Calls.findOne({ _id: callId });

    if (!call?.offer) {
      alert("No offer found!");
      return;
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        Meteor.callAsync("calls.addAnswerCandidate", callId, event.candidate.toJSON());
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(call.offer));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await Meteor.callAsync("calls.setAnswer", callId, answer);
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
        <button onClick={startWebcam} disabled={webcamActive}>
          Start Webcam
        </button>
        <button onClick={createCall} disabled={!webcamActive}>
          Create Call
        </button>
        {callId && <p>Share this Call ID: {callId}</p>}
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
