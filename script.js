
let mediaRecorder;
let recordedBlobs;
let recordingRunTime = 0;
let recordingRolloverTime = 60;
let recordingRunInterval;
let rolloverCount = 0;
let userStop = true;
let currentMediaStream;
let videoUploadButtons = [];
let batchUpload = false;
let versionAnnounced = false;
let currentUploadIndex = 0;
let stopIndex = 0;
let constraints = {
  audio: true,
  video: {
    facingMode: "user", // Use 'user' for front camera
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: {
      ideal: 30,
      max: 40
    }
  }
};

const fileInput = document.getElementById('videoUpload');
const uploadAll = document.getElementById("uploadAll");
const startRecording = document.getElementById('startRecording');
const stopRecording = document.getElementById('stopRecording');
const video = document.getElementById('liveVideo');
const uploadedVideo = document.getElementById('uploadedVideo');
const timer = document.getElementById('timer');

video.muted = "muted"
video.setAttribute("playsinline", true);

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
    return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)].join(".");
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
const facingInput = document.getElementById('facingInput');
urlInput.addEventListener('change', (event) => {
  const url = event.target.value;
  uploadedVideo.src = url;
  uploadedVideo.play();
});
facingInput.addEventListener('change', (event) => {
  const value = event.target.checked;
  if (!value) {
    constraints.video.facingMode = "user";
    currentMediaStream.applyConstraints(constraints);
    stopRecording.click();
    startRecording.click();
  } else {
    constraints.video.facingMode = "environment";
    currentMediaStream.applyConstraints(constraints);
    stopRecording.click();
    startRecording.click();
  }

});

uploadAll.addEventListener('click', () => {
  videoUploadButtons.forEach(function(button) {
    button.click();
    batchUpload = true;
  })
  batchUpload = false;
})

startRecording.addEventListener('click', () => {
  timer.style.display = "flex";
  timer.innerText = recordingRolloverTime - recordingRunTime;
  versionAnnounced = false
  userStop = true;
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      currentMediaStream = stream.getVideoTracks()[0];
      video.srcObject = stream;
      video.play();

      recordedBlobs = [];
      mediaRecorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 64000,
        videoBitsPerSecond: 1250000,
        mimeType: 'video/mp4; codecs="avc1.424028, mp4a.40.2"',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedBlobs.push(event.data);
        }
      };

      mediaRecorder.start();
      recordingRunTime = 0;
      recordingRunInterval = setInterval(function() {
        timer.innerText = recordingRolloverTime - recordingRunTime;
        if ((recordingRolloverTime - recordingRunTime) <= 5) {
          timer.style.color = "red";
        } else {
          timer.style.color = "white";
        }
        if (recordingRunTime > recordingRolloverTime) {
          userStop = false;
          stopRecording.click()
          setTimeout(function() { startRecording.click() }, 200)
          rolloverCount++
          clearInterval(recordingRunInterval);
        }
        recordingRunTime++
      }, 1000)
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
    });
});

stopRecording.addEventListener('click', () => {
  if (videoUploadButtons.length > 0) {
    uploadAll.style.display = "flex";
  }
  timer.style.display = "none";
  var thisStop = stopIndex;
  stopIndex++;
  mediaRecorder.stop();
  clearInterval(recordingRunInterval);
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedBlobs, { type: 'video/mp4' });
    const videoURL = URL.createObjectURL(blob);
    const newVideo = document.createElement('video');
    const videoSubcontainer = document.createElement("div");
    newVideo.setAttribute("playsinline", true);
    newVideo.src = videoURL;
    newVideo.controls = true;
    newVideo.id = "preSubmit"
    videoSubcontainer.className = "subVideoContainer";
    videoSubcontainer.appendChild(newVideo)
    document.getElementById("finishedVideoContainer").appendChild(videoSubcontainer);

    video.srcObject.getTracks().forEach(track => track.stop());
    //document.body.removeChild(video);

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
      formData.append('file', blob, 'SPOILER_video.mp4');
      var thumbData = new FormData()
      thumbData.append("source", b64toBlob(capture()), 'thumb.png');

      // Send the video file to the Discord webhook
      if (!batchUpload) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ "content": "Video from iOS Version " + ver })
        }).then(function() {
          versionAnnounced = true;
        })
      }
      var waitInterval = setInterval(function() {
        if (versionAnnounced && currentUploadIndex == thisStop) {
          fetch(webhookUrl, {
            method: 'POST',
            body: formData
          })
            .then(response => {
              console.log('Video submitted to Discord successfully!');
              currentUploadIndex++;
            })
            .catch(error => {
              console.error('Error submitting video to Discord:', error);
            });
          clearInterval(waitInterval);
        }
      })
    });
    videoSubcontainer.appendChild(submitButton);
    videoUploadButtons.push(submitButton);
    if ((rolloverCount > 0) && userStop) {
      alert("Video rolled over due to length restrictions. There are " + rolloverCount + " videos stored.")
    }
  };
});
