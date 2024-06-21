const video = document.getElementById('liveVideo');
video.muted = "muted";
video.setAttribute("playsinline", true);
const uploadedVideo = document.getElementById('uploadedVideo');
let mediaRecorder;
let recordedBlobs = [];
let currentMediaStream;
let userStop = false;
let recordingRunTime = 0;
let recordingRunInterval;
let recordingRolloverTime = 60;
let rolloverCount = 0;
const fileInput = document.getElementById('videoUpload');
let constraints = {
  audio: true,
  video: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: {
      ideal: 30,
      max: 40
    }
  }
};

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

facingInput.addEventListener('change', async (event) => {
  const value = event.target.checked;
  if (!value) {
    constraints.video.facingMode = "user";
  } else {
    constraints.video.facingMode = "environment";
  }
  await switchCamera();
});

const startRecording = document.getElementById('startRecording');
const stopRecording = document.getElementById('stopRecording');

startRecording.addEventListener('click', async () => {
  await startRecordingWithNewStream();
});

stopRecording.addEventListener('click', () => {
  userStop = true;
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
});

async function startRecordingWithNewStream() {
  userStop = false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentMediaStream = stream;
    video.srcObject = stream;

    video.onloadedmetadata = async () => {
      video.play();

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

      mediaRecorder.onstop = () => {
        clearInterval(recordingRunInterval);
        handleRecordingStop();
      };

      mediaRecorder.start();

      // Start the interval to check for rollover time
      recordingRunTime = 0;
      recordingRunInterval = setInterval(() => {
        recordingRunTime++;
        if (recordingRunTime > recordingRolloverTime) {
          rolloverCount++;
          mediaRecorder.stop();
          startRecordingWithNewStream();
          clearInterval(recordingRunInterval);
        }
      }, 1000);
    };
  } catch (err) {
    console.error('Error accessing camera:', err);
  }
}

async function switchCamera() {
  mediaRecorder.stop();
  startRecordingWithNewStream();
}

function handleRecordingStop() {
  const blob = new Blob(recordedBlobs, { type: 'video/mp4' });
  const videoURL = URL.createObjectURL(blob);
  const newVideo = document.createElement('video');
  const videoSubcontainer = document.createElement("div");
  newVideo.setAttribute("playsinline", true);
  newVideo.src = videoURL;
  newVideo.controls = true;
  newVideo.id = "preSubmit";
  videoSubcontainer.className = "subVideoContainer";
  videoSubcontainer.appendChild(newVideo);
  document.getElementById("finishedVideoContainer").appendChild(videoSubcontainer);

  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }

  newVideo.onloadedmetadata = () => {
    newVideo.play();
  };

  const submitButton = document.createElement('button');
  submitButton.textContent = 'Submit to Discord';
  submitButton.addEventListener('click', () => {
    const webhookUrl = 'https://discord.com/api/webhooks/1253043926743388170/wfrnvD-bPjbDgC32oqbN99QBjpl38xNKjr4rfVIgxGhc-pUe3lrJPm-uZ2pOCUckt1C-';
    const formData = new FormData();
    formData.append('file', blob, 'SPOILER_video.mp4');
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

  videoSubcontainer.appendChild(submitButton);

  if (rolloverCount > 0 && userStop) {
    alert("Video rolled over due to length restrictions. There are " + rolloverCount + " videos stored.");
  }

  recordedBlobs = []; // Clear the recorded blobs for the next recording
}
