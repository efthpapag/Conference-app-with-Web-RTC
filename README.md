# Short description
The application we developed is intended to conduct teleconferences theoretically without limitation on the number of participants.

# Installation/Preparation Instructions
1. Replacing the word localhost where it appears with the ip of the machine that will run the server in the index.html and client.js files.
2. Deactivating the firewall and antivirus of the machine acting as a server.
3. Appropriate configuration of the users browser to allow the website to use the camera and microphone http://ip_of_server:3000. e.g. in Chrome https://medium.com/@Carmichaelize/enabling-the-microphone-camera-in-chrome-for-local-unsecure-origins-9c90c3149339
4. Installing express and socket.io by running npm install, npm install express --save, npm install socket.io --save

# Instructions for use
## Server
1. Start the server by navigating to the webrtc_app directory and executing the node server.js command.
## Client
### Connection
1. Typing in the browser the URL http://ip_of_server:3000 on a local network.
2. Filling in the room number. If there is already a room with the specific number, then the user will connect to it, otherwise a new room with the specific number will be created.
3. Filling the user's name.
4. Pressing the connect button.
### Send message
1. Write a message in the "Your message.." box.
2. Pressing the send button.
### Sending File
1. Select a file by pressing the choose file button.
2. Pressing the send button, if there is a message written then it is ignored.
### File download
1. Pressing the file name/link that appears in the chat after sending.
### View list of participants
1. Pressing the participants button.
2. To return to the messages press the chat button.
### Disconnection
1. Pressing the disconnect button.

# High level documentation
The application is based on the existence of a server for the signaling process and the transmission of socket messages to the users. The signaling process is implemented with a series of socket messages which are transmitted by the server and contain the required information to establish a connection between the users. The exchange of messages and files is implemented in the same way and the files that are sent are saved on the server machine in a folder corresponding to each room which you delete when all the participants leave the room.


# Software and Services Used
* WebRTC with javascript
* Express as a web application framework
* Socket.io for communication between server and clients
* Google chrome as a browser to control the application
* Ice servers for rtc peer connections
* Html and css for website development