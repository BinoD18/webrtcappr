// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { exec } = require('child_process');
const path = require('path');

app.use(express.static('public'));

io.on('connection', socket => {
    console.log('New user connected');

    socket.on('join', room => {
        socket.join(room);
        socket.to(room).emit('user-connected');
    });

    socket.on('disconnect', () => {
        io.emit('user-disconnected');
    });

    socket.on('offer', payload => {
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', payload => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', payload => {
        io.to(payload.target).emit('ice-candidate', payload);
    });

    socket.on('screen-offer', payload => {
        io.to(payload.target).emit('screen-offer', payload);
    });

    socket.on('screen-answer', payload => {
        io.to(payload.target).emit('screen-answer', payload);
    });

    socket.on('chat-message', message => {
        io.to(message.room).emit('chat-message', message);
    });
});


const outputFilePath = path.join(__dirname, 'output.m3u8');

app.get('/stream', (req, res) => {
  const inputStream = 'https://webrtcappr.onrender.com/';
  const command = `ffmpeg -i ${inputStream} -codec: copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls ${outputFilePath}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing FFmpeg: ${error.message}`);
      res.status(500).send('Error processing stream');
      return;
    }

    console.log(`FFmpeg output: ${stdout}`);
    res.send('Stream processed successfully');
  });
});

// Route pour télécharger directement le fichier .m3u8
app.get('/download', (req, res) => {
  res.download(outputFilePath, 'output.m3u8', (err) => {
    if (err) {
      console.error(`Error during download: ${err.message}`);
      res.status(500).send('Error downloading the file');
    } else {
      console.log('File downloaded successfully');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
