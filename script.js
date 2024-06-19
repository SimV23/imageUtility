const video = document.createElement('video');
video.setAttribute("playsinline", true);
const uploadedVideo = document.getElementById('uploadedVideo');
let mediaRecorder;
let recordedBlobs;

const fileInput = document.getElementById('videoUpload');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    uploadedVideo.src = e.target.result;
    uploadedVideo.play();
  };

  reader.readAsDataURL(file);
});
const urlInput = document.getElementById('urlUpload');

urlInput.addEventListener('change', (event) => {
  const url = event.target.value;
  uploadedVideo.src = url;
  uploadedVideo.play();
});

const startRecording = document.getElementById('startRecording');
const stopRecording = document.getElementById('stopRecording');

startRecording.addEventListener('click', () => {
  const constraints = {
    audio: true,
    video: {
      facingMode: document.getElementById("facingInput").value // Use 'user' for front camera
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      video.srcObject = stream;
      video.play();
      document.body.appendChild(video);

      recordedBlobs = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedBlobs.push(event.data);
        }
      };

      mediaRecorder.start();
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
    });
});

stopRecording.addEventListener('click', () => {
  mediaRecorder.stop();

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const videoURL = URL.createObjectURL(blob);
    const newVideo = document.createElement('video');
    newVideo.setAttribute("playsinline", true);
    newVideo.src = videoURL;
    newVideo.controls = true;
    document.body.appendChild(newVideo);

    video.srcObject.getTracks().forEach(track => track.stop());
    document.body.removeChild(video);

    // Wait for the video to load before playing
    newVideo.onloadedmetadata = () => {
      newVideo.play(); 
    };

    // Create a new button to submit to Discord webhook
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit to Discord';
    submitButton.addEventListener('click', () => {
      // Replace with your actual Discord webhook URL
      const webhookUrl = 'https://discord.com/api/webhooks/1253043926743388170/wfrnvD-bPjbDgC32oqbN99QBjpl38xNKjr4rfVIgxGhc-pUe3lrJPm-uZ2pOCUckt1C-'; 

      // Create a form data object to send the video file
      const formData = new FormData();
      formData.append('file', blob, 'video.webm');

      // Send the video file to the Discord webhook
      fetch(webhookUrl, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        console.log('Video submitted to Discord successfully!');
      })
      .catch(error => {
        console.error('Error submitting video to Discord:', error);
      });
    });
    document.body.appendChild(submitButton);
  };
});
