//DOM elements.
const roomSelectionContainer = document.getElementById('room-selection-container')
const roomInput = document.getElementById('room-input')
const nameInput = document.getElementById('name-input')
const connectButton = document.getElementById('connect-button')

const localVideoContainer = document.getElementById('localVideoContainer')
const videoCont = document.getElementById('videoCont')
const chatCont = document.getElementById('chatCont')
const localVideo = document.getElementById('localVideo')
const participantListCont = document.getElementById('participantListCont')
const disconnectButton = document.getElementById('disconnectButton')

//DOM element initial display settings
videoCont.style.display = "none"
chatCont.style.display = "none"
participantListCont.style.display = "none"
disconnectButton.style.display = "none"

//Variables.
const socket = io()
const mediaConstraints = {
  audio: true,
  video: { width: 1280, height: 720 },
}
let localStream
let remoteStreams = []
let isRoomCreator
let rtcPeerConnections = {}// Connection between the local device and the remote peer.
let roomId
let clientName
let clientId // CONCATENATE NAME WITH A RANDOMLY GENERATED ID
let clientData

//Free public STUN servers provided by Google.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

//BUTTON LISTENERS 

//join/create room
connectButton.addEventListener('click', () => {
  joinRoom(roomInput.value, nameInput.value)
})

//disconects user
disconnectButton.addEventListener('click', () => {
  leaveRoom(clientData)
})

//sends chat message
const form = document.querySelector('form');
form.addEventListener('submit', () => {
  let input = document.getElementById('myFile')
  let isFile = true
  let toSend = undefined
  if(!input.value){
    input = document.getElementById('chatInput')
    isFile = false
    toSend = input.value
  }
  else{
    toSend = input.files[0].name
    sendFileToServer(roomId, input.files[0], input.files[0].name)
  }
  sendChatMessage(toSend, clientData, isFile)
  document.getElementById('myFile').value=''
  document.getElementById('chatInput').value=''
})

//makes chat appear
chatButton.addEventListener('click', () => {
  participantListCont.style.display = "none"
  chatCont.style.display = "block"
})

//makes list of participents appear
listButton.addEventListener('click', () => {
  participantListCont.style.display = "block"
  chatCont.style.display = "none"
})

// SOCKET EVENT CALLBACKS
//for when room gets created
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')

  await setLocalStream(mediaConstraints)
  isRoomCreator = true
})

//TO ADD COMMENT
socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')

  await setLocalStream(mediaConstraints)
  isRoomCreator = false
  socket.emit('start_call', clientData)
})

//TO ADD COMMENT
socket.on('start_call', async (event) => {
  console.log('Socket event callback: start_call')

  let peerId = event.clientId
  
  rtcPeerConnections[peerId] = {'peerName':event.clientName, 'peerConnection':new RTCPeerConnection(iceServers)}
  addLocalTracks(rtcPeerConnections[peerId].peerConnection)
  rtcPeerConnections[peerId].peerConnection.ontrack = event => setRemoteStream(event,peerId)
  rtcPeerConnections[peerId].peerConnection.onicecandidate = sendIceCandidate
  await createOffer(rtcPeerConnections[peerId].peerConnection)  
})

//TO ADD COMMENT
socket.on('webrtc_offer', async (event) => {
  console.log('Socket event callback: webrtc_offer')

  let isNotAPeer = true
  for(let key in rtcPeerConnections) {
    if (key === event.clientData.clientId){
      isNotAPeer = false
    }
  }  

  if (isNotAPeer){
    let peerId = event.clientData.clientId
    rtcPeerConnections[peerId] = {'peerName':event.clientData.clientName, 'peerConnection':new RTCPeerConnection(iceServers)}
    addLocalTracks(rtcPeerConnections[peerId].peerConnection)
    rtcPeerConnections[peerId].peerConnection.ontrack = event => setRemoteStream(event,peerId)
    rtcPeerConnections[peerId].peerConnection.onicecandidate = sendIceCandidate
    rtcPeerConnections[peerId].peerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp))
    await createAnswer(rtcPeerConnections[peerId].peerConnection,peerId)
    showParticipant(rtcPeerConnections[peerId].peerName)
  }
})

//TO ADD COMMENT
socket.on('webrtc_answer', (event) => {
  console.log('Socket event callback: webrtc_answer')

  if(event.peerId === clientId){
    rtcPeerConnections[event.clientData.clientId].peerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp))
    showParticipant(rtcPeerConnections[event.clientData.clientId].peerName)
  }
})

//TO ADD COMMENT
socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate')

  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  console.log(event.clientData.clientId)
  rtcPeerConnections[event.clientData.clientId].peerConnection.addIceCandidate(candidate)
})

//for when chat message is received
socket.on('chat_message', async (event) => {
    updateChat(event.text, event.clientData, event.isFile)
})

//for when a peer gets disconnected
socket.on('peer_disconnection', (event) => {
  let peerId = event.clientData.clientId
  remoteStreams.splice(peerId, 1)
  delete rtcPeerConnections[peerId]
  let remoteVideoContainer = document.getElementById('remoteVideo_' + peerId)
  document.getElementById('videos').removeChild(remoteVideoContainer)
  updateParticipantList ()
})

//FUNCTIONS

//makes peer join room
function joinRoom(room, name) {
  if (room === '') {
    alert('Please type a room ID')
  } else {
    roomId = room
    clientName = name
    clientId = name + Math.floor(Math.random()*1000)
    clientData = { roomId: roomId, clientId: clientId, clientName: clientName }
    socket.emit('join', clientData)
    showVideoConference()
    showParticipant(clientName)
  }
}

//disconects peer from room
async function leaveRoom(clientData){
  socket.emit('disconnectPeer', {
    clientData:clientDatas
  })
  window.location.href = "http://localhost:3000"
}

//makes video conference appear instead of the log in/room creation 
function showVideoConference() {

  roomSelectionContainer.style.display = "none"
  videoCont.style.display = "block"
  chatCont.style.display = "block"
  disconnectButton.style.display = "block"

}

//ADD COMMENT

async function setLocalStream(mediaConstraints) {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
  } catch (error) {
    console.error('Could not get user media', error)
  }

  localStream = stream
  localVideo.srcObject = stream
  localVideoContainer.appendChild(makeLabel(clientName)) 
}

//ADD COMMENT
function addLocalTracks(rtcPeerConnection) {
  let arr = localStream.getTracks()
  let l = arr.length
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream)
  })
}

//ADD COMMENT
async function createOffer(rtcPeerConnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createOffer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    clientData,
  })
}

//ADD COMMENT
async function createAnswer(rtcPeerConnection, peerId) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createAnswer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    clientData,
    peerId
  })
}

//makes video appear
function setRemoteStream(event, peerId) {
  let flag = true
  for(let key in remoteStreams) {
    if (key === peerId){
      flag = false
    }
  }
  if(flag){  
    let remoteVideo = document.createElement('video')
    remoteVideo.setAttribute('autoplay', '')
    remoteVideo.setAttribute('muted', '')
    remoteVideo.srcObject = event.streams[0]
    remoteStreams[peerId] = event.stream

    let remoteVideoContainer = document.createElement('div') 
    remoteVideoContainer.setAttribute('id', 'remoteVideo_' + peerId) 
    remoteVideoContainer.setAttribute('class', 'videoContainer') 
    remoteVideoContainer.appendChild(remoteVideo) 
    console.log(peerId)
    remoteVideoContainer.appendChild(makeLabel(rtcPeerConnections[peerId].peerName)) 

    document.getElementById('videos').appendChild(remoteVideoContainer) 

    updateLayout() 
  }
  
}

//ADD COMMENT 
function sendIceCandidate(event) {
  if (event.candidate) {
    socket.emit('webrtc_ice_candidate', {
      clientData,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
}

//sends chat message
function sendChatMessage(text, clientData, isFile){
  socket.emit("chat_message", {
    text: text, 
    clientData: clientData,
    isFile : isFile
  })
  updateChat(text, clientData, isFile)
}

//makes a message appear in the chat
function updateChat(text, senderData, isFile) {
  const template = document.querySelector('template[data-template="message"]') 
  const senderName = template.content.querySelector('.messageName') 

  senderName.innerText = senderData.clientName 

  if(isFile){

    let bubble = template.content.querySelector('.messageBubbleClass')
    let link = document.createElement('a') 
    link.setAttribute('href', "\\stored_files\\" + roomId + "\\" + text)
    link.setAttribute('download', text)
    link.innerHTML = text
    bubble.appendChild(link)
  }
  else{
    template.content.querySelector('.messageBubbleClass').innerText = text
  }

  const clone = document.importNode(template.content, true)
  const messageText = clone.querySelector('.message') 
  if (senderData.clientId === clientId) {
    messageText.classList.add('myMessage') 
  } else {
    messageText.classList.add('peerMessage') 
  }

  const messagesText = document.querySelector('.messages') 
  messagesText.appendChild(clone) 

  // Scroll to bottom
  messagesText.scrollTop = messagesText.scrollHeight - messagesText.clientHeight 
  template.content.querySelector('.messageBubbleClass').innerText = ""
}

//sends file to server
function sendFileToServer(roomId, file, fileName){

  socket.emit("save_file",{
    roomId : roomId,
    file : file,
    fileName : fileName
  })

}

//adds participant's name to the list of participants
function showParticipant (peerName){
  const template = document.querySelector('template[data-template="participant"]') 
  const participantName = template.content.querySelector('.participantName') 

  participantName.innerText = peerName

  const clone = document.importNode(template.content, true)     

  const participants = document.querySelector('.participants') 
  participants.appendChild(clone) 
}

//remakes participant list from scratch
function updateParticipantList (){
  //delete list
  const list = document.querySelector('.list')
  list.removeChild(document.querySelector('.participants'))
  
  //remake list
  let participants = document.createElement('div') 
  participants.setAttribute('class', 'participants')
  list.appendChild(participants)
  showParticipant(clientName)
  for(let key in rtcPeerConnections){
    showParticipant(rtcPeerConnections[key].peerName)
  }
  
}

//creates label with caller's name
function makeLabel(label) {
  var vidLabel = document.createElement('div') 
  vidLabel.appendChild(document.createTextNode(label)) 
  vidLabel.setAttribute('class', 'videoLabel') 
  return vidLabel 
}

//updates CSS grid based on number of diplayed videos
function updateLayout() {
  var rowHeight = '73.5vh' 
  var colWidth = '73.5vw' 

  var numVideos = Object.keys(rtcPeerConnections).length + 1  // add one to include local video

  if (numVideos > 1 && numVideos <= 4) { // 2x2 grid
    rowHeight = '36vh' 
    colWidth = '36vw' 
  } else if (numVideos > 4) { // 3x3 grid
    rowHeight = '24vh' 
    colWidth = '24vw' 
  }

  document.documentElement.style.setProperty(`--rowHeight`, rowHeight) 
  document.documentElement.style.setProperty(`--colWidth`, colWidth) 
}