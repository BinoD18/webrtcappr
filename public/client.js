// public/client.js
const socket = io('/');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const screenVideo = document.getElementById('screenVideo');
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const shareScreenButton = document.getElementById('shareScreenButton');
const chatInput = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');
const chatMessages = document.getElementById('chatMessages');

let localStream;
let remoteStream;
let screenStream;
let peerConnection;
let screenPeerConnection;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;
shareScreenButton.onclick = shareScreen;
sendChatButton.onclick = sendChat;

function start() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localVideo.srcObject = stream;
            localStream = stream;
            callButton.disabled = false;
        })
        .catch(error => console.error('Error accessing media devices.', error));
}

function call() {
    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.ontrack = handleTrackEvent;
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', {
                sdp: peerConnection.localDescription,
                target: roomId
            });
        });
    callButton.disabled = true;
    hangupButton.disabled = false;
    shareScreenButton.disabled = false;
}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        socket.emit('ice-candidate', {
            target: roomId,
            candidate: event.candidate
        });
    }
}

function handleTrackEvent(event) {
    remoteVideo.srcObject = event.streams[0];
}

socket.on('user-connected', () => {
    console.log('User connected');
});

socket.on('user-disconnected', () => {
    console.log('User disconnected');
    hangup();
});

socket.on('offer', async (offer) => {
    if (!peerConnection) {
        call();
    }
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer.sdp));
    const answer = await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer);
    socket.emit('answer', {
        sdp: peerConnection.localDescription,
        target: roomId
    });
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer.sdp));
});

socket.on('ice-candidate', (candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate.candidate);
    peerConnection.addIceCandidate(iceCandidate);
});

function hangup() {
    peerConnection.close();
    peerConnection = null;
    callButton.disabled = false;
    hangupButton.disabled = true;
    shareScreenButton.disabled = true;
}

function shareScreen() {
    navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(stream => {
            screenStream = stream;
            screenVideo.srcObject = stream;
            screenPeerConnection = new RTCPeerConnection(servers);
            screenPeerConnection.onicecandidate = handleScreenICECandidateEvent;
            screenPeerConnection.ontrack = handleScreenTrackEvent;
            stream.getTracks().forEach(track => screenPeerConnection.addTrack(track, stream));
            screenPeerConnection.createOffer()
                .then(offer => screenPeerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit('screen-offer', {
                        sdp: screenPeerConnection.localDescription,
                        target: roomId
                    });
                });
        })
        .catch(error => console.error('Error accessing display media.', error));
}

function handleScreenICECandidateEvent(event) {
    if (event.candidate) {
        socket.emit('ice-candidate', {
            target: roomId,
            candidate: event.candidate
        });
    }
}

function handleScreenTrackEvent(event) {
    screenVideo.srcObject = event.streams[0];
}

socket.on('screen-offer', async (offer) => {
    if (!screenPeerConnection) {
        shareScreen();
    }
    screenPeerConnection.setRemoteDescription(new RTCSessionDescription(offer.sdp));
    const answer = await screenPeerConnection.createAnswer();
    screenPeerConnection.setLocalDescription(answer);
    socket.emit('screen-answer', {
        sdp: screenPeerConnection.localDescription,
        target: roomId
    });
});

socket.on('screen-answer', (answer) => {
    screenPeerConnection.setRemoteDescription(new RTCSessionDescription(answer.sdp));
});

function sendChat() {
    const message = chatInput.value;
    socket.emit('chat-message', { room: roomId, message });
    chatMessages.innerHTML += `<div>Moi: ${message}</div>`;
    chatInput.value = '';
}

socket.on('chat-message', (message) => {
    chatMessages.innerHTML += `<div>Autre: ${message.message}</div>`;
});
