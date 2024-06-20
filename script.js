const video = document.createElement('video');
video.muted = "muted"
video.setAttribute("playsinline", true);
const uploadedVideo = document.getElementById('uploadedVideo');
let mediaRecorder;
let recordedBlobs;

const fileInput = document.getElementById('videoUpload');

function b64toBlob(dataURI) {

  var byteString = atob(dataURI.split(',')[1]);
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);

  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: 'image/jpeg' });
}

function iOSversion() {
  if (/iP(hone|od|ad)/.test(navigator.platform)) {
    // supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
    var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
    return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)];
  }
}

let ver = iOSversion();
if (typeof ver === "undefined") {
  ver = "Not iOS";
}
function capture() {
  var canvas = document.createElement('canvas');
  var videoPre = document.getElementById('preSubmit');
  canvas.getContext('2d').drawImage(videoPre, 0, 0, videoPre.offsetWidth, videoPre.offsetHeight / 2);
  var data = canvas.toDataURL('image/png');
  console.log(data);
  return data;
}

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
      facingMode: document.getElementById("facingInput").value, // Use 'user' for front camera
      frameRate: {
        ideal: 30,
        max: 40
      }
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
    newVideo.id = "preSubmit"
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
      var thumbData = new FormData()
      thumbData.append("source", b64toBlob(capture()), 'thumb.png');

      // Send the video file to the Discord webhook
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "content": "Video from iOS Version " + ver })
      })
      fetch(webhookUrl, {
        method: 'POST',
        body: thumbData
      })
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
