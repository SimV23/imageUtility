
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
const saveInput = document.getElementById('saveUpload');
const uploadAll = document.getElementById("uploadAll");
const startRecording = document.getElementById('startRecording');
const stopRecording = document.getElementById('stopRecording');
const video = document.getElementById('liveVideo');
const uploadedVideo = document.getElementById('uploadedVideo');
const timer = document.getElementById('timer');
const downloadSavebutton = document.getElementById('downloadSavebutton');
video.muted = "muted"
video.setAttribute("playsinline", true);

const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
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

saveInput.addEventListener('change', (event) => {
  var file = event.target.files[0];

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target.result);
    loadSave(data);
  };
  reader.readAsText(file);
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

downloadSavebutton.addEventListener('click', () => {
  if (videoUploadButtons.length == 0) {
    alert("There is nothing to save!")
    return;
  }
  generateSave();
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

const blobToBase64 = async blob => {
  if (typeof blob === "string") {
    blob = await fetch(blob).then(r => r.blob());
  }
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise(resolve => {
    reader.onloadend = () => {
      resolve(reader.result);
    };
  });
};

async function generateSave() {
  var savedFile = [];
  var videoArray = Array.from(document.getElementById("finishedVideoContainer").children);
  videoArray.forEach(async function(videoElement) {
    var sourceBlob = await blobToBase64(videoElement.children[0].src).then(result => {
      savedFile.push(result)
      if (savedFile.length == videoArray.length) {
        const dlblob = new Blob([JSON.stringify(savedFile)], { type: 'application/json' });
        const url = URL.createObjectURL(dlblob);
        const link = document.createElement('a');
        link.href = url;
        link.download = Math.floor(1000 * Math.sqrt(Math.random())).toString() + '-savestate.libblesave';
        link.click();
      }
    })
  })
}

function loadSave(save) {
  save.forEach(function(video) {
    var thisStop = stopIndex;
    stopIndex++;
    var blob = b64toBlob(video.replace("data:video/mp4;base64,", ""), 'video/mp4');
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
  })
}
