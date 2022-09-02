const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

app.use('/', express.static('public'))

var rooms = []

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    const roomId = data.roomId
    const clientName = data.clientName
    const selectedRoom = rooms[roomId]
    let numberOfClients
    if (selectedRoom){
      numberOfClients = selectedRoom.length
    } else {
      numberOfClients = 0
    }

    // These events are emitted only to the sender socket.
    if (numberOfClients == 0) {
      console.log('Creating room ' + roomId + ' and emitting room_created socket event')
      rooms[roomId] = [clientName]
      socket.join(roomId)
      socket.emit('room_created', roomId)
      console.log(rooms[roomId])

      const fs = require('fs');
      const path = require('path')
        
      fs.mkdir(path.join(__dirname, "public\\stored_files\\" + roomId), (err) => {
          if (err) {
              return console.error(err);
          }
          console.log('Directory created successfully!')
      })

    } else {
      console.log('Joining room ' + roomId + ' and emitting room_joined socket event')
      rooms[roomId].push(clientName)
      socket.join(roomId)
      socket.emit('room_joined', roomId)
      console.log(rooms[roomId])
    }
  })

  // These events are emitted to all the sockets connected to the same room except the sender.
  socket.on('start_call', (event) => {
    console.log('Broadcasting start_call event to peers in room ' + event.roomId)
    socket.broadcast.to(event.roomId).emit('start_call', event)
  })
  socket.on('webrtc_offer', (event) => {
    console.log('Broadcasting webrtc_offer event to peers in room ' + event.clientData.roomId)
    socket.broadcast.to(event.clientData.roomId).emit('webrtc_offer', event)
  })
  socket.on('webrtc_answer', (event) => {
    console.log('Broadcasting webrtc_answer event to peers in room ' + event.clientData.roomId)
    socket.broadcast.to(event.clientData.roomId).emit('webrtc_answer', event)
  })
  socket.on('webrtc_ice_candidate', (event) => {
    console.log('Broadcasting webrtc_ice_candidate event to peers in room ' + event.clientData.roomId)
    socket.broadcast.to(event.clientData.roomId).emit('webrtc_ice_candidate', event)
  })
  socket.on('chat_message', (event) =>{
    console.log('Broadcasting chat_message event to peers in room ' + event.clientData.roomId)
    socket.broadcast.to(event.clientData.roomId).emit('chat_message', event)
  })
  socket.on('save_file', (event) => {
    console.log('File ' + event.fileName + ' saved')
    console.log('File ' + event.file + ' saved')

    const fs = require('fs')
    
    fs.writeFile('public\\stored_files\\' + event.roomId + '\\' + event.fileName, event.file, err => {
      if (err) {
        console.error(err)
        return
      }
      //file written successfully
    })  
  })
  socket.on('disconnectPeer', (event) => {
    console.log('Broadcasting disconnection message event to peers in room ' + event.clientData.roomId)
    socket.leave(event.clientData.roomId)
    rooms[event.clientData.roomId].splice(rooms[event.clientData.roomId].indexOf(event.clientData.clientName), 1)
    socket.broadcast.to(event.clientData.roomId).emit('peer_disconnection', event)
    if (rooms[event.clientData.roomId].length == 0){
      const fs = require('fs')
      fs.rmdir('public\\stored_files\\' + event.clientData.roomId,{ recursive: true }, err => {
        if (err) {
          console.error(err)
          return
        }
      })
      rooms.splice(event.clientData.roomId, 1)
    }
    socket.broadcast.to(event.clientData.roomId).emit('peer_disconnection', event)
  })
})

// START THE SERVER
const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log('Express server listening on port ' + port)
})