///REPLACE THIS AFTER YOU HOST WEBSOCKET
const URL = "ws://localhost:9083";
///REPLACE THIS AFTER YOU HOST WEBSOCKET





//Variables
let past_history=''
let selectedMode=''
const video = document.getElementById("videoElement");
const canvas = document.getElementById("canvasElement");
let promptByuser='';
let accumulatedText = '';
let context;
let customConfig;
// Initialize context here
window.addEventListener("load", () => {

    context = canvas.getContext("2d");
    console.log(canvas);
    setInterval(captureImage, 3000);
});
let stream = null;
let currentFrameB64;
let webSocket = null;
let audioContext = null;
let mediaRecorder = null;
let processor = null;
let pcmData = [];
let interval = null;
let initialized = false;
let audioInputContext;
let workletNode;
let isSessionActive = false;




// Function to start screen capture
async function startScreenShare() {
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { max: 640 },
                height: { max: 480 },
            },
        });

        video.srcObject = stream;
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                console.log("video loaded metadata");
                $('.placeholder').hide();
                $('#videoElement').show();
                
                
                resolve();
            }
        });

    } catch (err) {
        console.error("Error accessing the screen: ", err);
    }
}
//function to start webcam and register a promise
async function startWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { max: 640 },
                height: { max: 480 }
            }
        });
        video.srcObject = stream;
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                console.log("video loaded metadata");
                $('.placeholder').hide();
                $('#videoElement').show();
                
                resolve();
            }
        });
    } catch (err) {
        console.error("Error accessing webcam: ", err);
    }
}



// Function to capture an image from the shared screen
function captureImage() {
    if (stream && video.videoWidth > 0 && video.videoHeight > 0 && context) {
        canvas.width = 640;
        canvas.height = 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg").split(",")[1].trim();
        currentFrameB64 = imageData;
    }
    else {
        console.log("no stream or video metadata not loaded");
    }
}

//Function to connect to the websocket Server
function connect() {
    console.log("connecting: ", URL);
    console.log("connecting")

    webSocket = new WebSocket(URL);

    webSocket.onclose = (event) => {
        console.log("websocket closed: ", event);
        UIkit.notification({
            message: 'Connection to Server is Closed!',
            status: 'warning',
            pos: 'top-right',
            timeout: 5000
        });
    };

    webSocket.onerror = (event) => {
        console.log("websocket error: ", event);
        UIkit.notification({
            message: 'Connection to Server has error. Restart the server!',
            status: 'warning',
            pos: 'top-right',
            timeout: 5000
        });
    };

    webSocket.onopen = (event) => {
        console.log("websocket open: ", event);
        UIkit.notification({
            message: 'Connection to Server Successfull!',
            status: 'primary',
            pos: 'top-right',
            timeout: 5000
        });
        sendInitialSetupMessage();
    };

    webSocket.onmessage = receiveMessage;
}

//function to send Handshake message to Gemini
function sendInitialSetupMessage() {

    console.log("sending setup message");
    setup_client_message = customConfig;

    webSocket.send(JSON.stringify(setup_client_message));
}

//Function to send Voice and Video
function sendVoiceMessage(b64PCM) {
    if (webSocket == null) {
        console.log("websocket not initialized");
        return;
    }

    payload = {
        realtime_input: {
            media_chunks: [{
                mime_type: "audio/pcm",
                data: b64PCM,
            },
            {
                mime_type: "image/jpeg",
                data: currentFrameB64,
            },
            ],
        },
    };

    webSocket.send(JSON.stringify(payload));
    console.log("sent: ", payload);
}


//Function to recieve text Message and process Audio Data for further processing
function receiveMessage(event) {
    const messageData = JSON.parse(event.data);
    const response = new Response(messageData);
    if(messageData.text=="Error Occured Session Limit Reached"){
        alert("Session Limit Reached, Restarting");
    }
    
    

    if (response.text) {
        const combinedText = messageData.text
    .map(item => item.text
        .replace(/\n/g, ' ')
        .replace(/[^\w\s,;!?]/g, '')
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
        accumulatedText += combinedText;
        if(combinedText!="" || combinedText!= "undefined" || combinedText != "None") {
        displayMessage(combinedText);
        console.log(past_history)
        }
    }
    if (response.audioData) {
        injestAudioChuckToPlay(response.audioData);
    }
}

//Function for Audio Processing
async function initializeAudioContext() {
    if (initialized) return;

    audioInputContext = new (window.AudioContext ||
        window.webkitAudioContext)({
        sampleRate: 24000
    });
    await audioInputContext.audioWorklet.addModule("pcm-processor.js");
    workletNode = new AudioWorkletNode(audioInputContext, "pcm-processor");
    workletNode.connect(audioInputContext.destination);
    initialized = true;
}

//Function for Audio Processing
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

//Function for Audio Processing
function convertPCM16LEToFloat32(pcmData) {
    const inputArray = new Int16Array(pcmData);
    const float32Array = new Float32Array(inputArray.length);

    for (let i = 0; i < inputArray.length; i++) {
        float32Array[i] = inputArray[i] / 32768;
    }

    return float32Array;
}

//Function to send processed Audio to play
async function injestAudioChuckToPlay(base64AudioChunk) {
    try {
        if (audioInputContext.state === "suspended") {
            await audioInputContext.resume();
        }
        const arrayBuffer = base64ToArrayBuffer(base64AudioChunk);
        const float32Data = convertPCM16LEToFloat32(arrayBuffer);
        console.log(float32Data)
        workletNode.port.postMessage(float32Data);
 


if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();
return data;
    
} catch (error) {
console.error("Error processing audio chunk:", error);
}
}

//function to generate Audio Data for sending
function recordChunk() {
    // if (!isSessionActive) return;
    console.log("recordchunk runs")

    const buffer = new ArrayBuffer(pcmData.length * 2);
    const view = new DataView(buffer);
    pcmData.forEach((value, index) => {
        view.setInt16(index * 2, value, true);
    });

    const base64 = btoa(
        String.fromCharCode.apply(null, new Uint8Array(buffer))
    );

    sendVoiceMessage(base64);
    pcmData = [];
}

//Function to Initialize sending input
async function startAudioInput() {
    audioContext = new AudioContext({
        sampleRate: 16000,
    });

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            channelCount: 1,
            sampleRate: 16000,
        },
    });

    const source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = inputData[i] * 0x7fff;
        }
        pcmData.push(...pcm16);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    interval = setInterval(recordChunk, 3000);
}

//Function to Stop all the process
function stopAudioInput() {
    $('.placeholder').show();
    $('#videoElement').hide();
    UIkit.notification({
        message: 'Session Ended!',
        status: 'primary',
        pos: 'top-right',
        timeout: 5000
    });
    console.log("stoppin first");
    if (processor) {
        processor.disconnect();
    }
    if (audioContext) {
        audioContext.close();
    }

    clearInterval(interval);
}



// New transcription function 
function transcribeAudio(audioData) {
try {
console.log("Called");
// Create a Blob from the audio data
const blob = new Blob([audioData], { type: 'audio/wav' });

recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
    console.log('Transcription:', transcript);
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
};

// Start recognition
recognition.start();
} catch (error) {
console.error('Transcription error:', error);
}
}




// Class that handles the response from server
class Response {
    constructor(data) {
        this.text = null;
        this.audioData = null;
        this.endOfTurn = null;

        if (data.text) {
            this.text = data.text
        }

        if (data.audio) {
            this.audioData = data.audio;
        }
    }
}


// Function get's called when you press startProcess
async function startProcess(){
    
   
    // If session is already active, clean up first
    if (isSessionActive) {
        stopAudioInput();
        if (webSocket) {
            webSocket.close();
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        isSessionActive = false;
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // const selectElement = document.getElementById('geminiVoiceSelect');
    // const selectedVoice = selectElement.value;
    // const selectMode= document.getElementById('textoraudio');
    // const selectedMode = selectMode.value;

    // const slider = document.getElementById('temperatureSlider');
    // const temp = parseFloat(slider.value);

    // customConfig= {
    //     setup: {
    //         generation_config: { 
    //             response_modalities: [selectedMode],
    //             temperature: temp
    //         },
    //         speech_config: {
    //             voice_config: {
    //                 prebuilt_voice_config: {
    //                     voice_name: selectedVoice
    //                 }
    //             }
    //         }
    //     }
    // };
    console.log(selectedMode)
   
    if(selectedMode == "webcam") {
        
   await startWebcam()
    }
else {
    
        await startScreenShare();
}

    //setInterval(captureImage, 3000);
    // document.getElementById('wrap').style.display = 'none';
    // UIkit.notification({
    //     message: 'Screen Share Started!',
    //     status: 'primary',
    //     pos: 'top-right',
    //     timeout: 5000
    // });

    // // Initialize audio context right away
    await initializeAudioContext();

    connect();
    startAudioInput();
    
   
    

}


//Function to render Text message on screen

function displayMessage(text) {
    // Filter out content that exists in pastHistory
    let newText = text;
    
    if (past_history) {
        newText = text.replace(past_history, '').trim();
    }
    
    // Only display if there's new content
    if (newText && newText != '') {
        const messageDiv = document.getElementById('chat');
        console.log(messageDiv)
        const div = document.createElement('div');
        div.className = 'brd-top vrx-pt-2 vrx-mt-2';
        
        const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        
        div.innerHTML = `
            <p class="vrx-primary-light">${newText}</p>
            <h5 class="vrx-text-semibold vrx-text-xs vrx-d-flex vrx-justify-content-between vrx-mb-0">
                <span>${timestamp}</span>
                <a href="#"><img src="images/icon-copy.svg" alt=""/></a>
            </h5>
        `;
        
        messageDiv.appendChild(div);
        messageDiv.scrollTop = messageDiv.scrollHeight;
            // Update pastHistory with the new content
            past_history = text;
        
    }
}
// function displayMessage(text) {

// // Filter out content that exists in pastHistory
// let newText = text;

//     if (past_history) {
//         newText = text.replace(past_history, '').trim();
//     }
    
//     // Only display if there's new content
//     if (newText) {
//         const messageDiv = document.getElementById('chatLog');
//         const paragraph = document.createElement('p');
        
//         const timestamp = new Date().toLocaleString('en-US', {
//             month: 'short',
//             day: 'numeric',
//             year: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit',
//             second: '2-digit',
//             hour12: true
//         });
        
//         paragraph.textContent = `[${timestamp}] ${newText}`;
//         messageDiv.appendChild(paragraph);
//         messageDiv.scrollTop = messageDiv.scrollHeight;
        
//         // Update pastHistory with the new content
//         past_history = text;

//         const copyButton = document.querySelector('.copy-button');
//         const displayStyle = window.getComputedStyle(copyButton).display;
        
//         if (displayStyle === 'none') {
//             copyButton.style.display = 'block';
//         }
//     }
// }

//Function to render Text message on screen
function addParagraphToDiv(divId, text) {
    const newParagraph = document.createElement("p");
    newParagraph.textContent = text;
    console.log(text)
    const div = document.getElementById(divId);
    div.appendChild(newParagraph);
}


//Function for slider
// function updateTemperature() {
//     const slider = document.getElementById('temperatureSlider');
//     const display = document.getElementById('temperatureValue');
//     const temperature = parseFloat(slider.value);
    
//     // Update the display
//     display.textContent = temperature.toFixed(1);
    
//     // Example configuration object with temperature
//     const config = {
//         generation_config: {
//             temperature: temperature,
//             // other config options...
//         }
//     };

//     const value = slider.value;
//     const percentage = value * 100;
//     slider.style.background = `linear-gradient(to right, #5529d6 0%, #5529d6 ${percentage}%, #e8e4f7 ${percentage}%, #e8e4f7 100%)`;
//     return temperature;
// }

//Function that handles Visibility of the "Voice Selection"
// function toggleVoiceSelection() {
//     const modeSelect = document.getElementById('textoraudio');
//     const voiceContainer = document.getElementById('voiceSelectionContainer');
    
//     if (modeSelect.value === 'AUDIO') {
//         voiceContainer.style.display = 'block';
//     } else {
//         voiceContainer.style.display = 'none';
//     }
// }




//function that handles copy function
async function copy() {
    const chatLog = document.getElementById('chatLog');
    const text = chatLog.innerText;
    
    try {
        await navigator.clipboard.writeText(text);
        const copyButton = document.querySelector('.copy-button');
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = 'Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// // Function to Toggle Voice Selection
// function toggleVoiceSelection() {
//     const container = document.getElementById('voiceSelectionContainer');
//     if (document.getElementById('textoraudio').value === 'AUDIO') {
//         container.style.display = 'block';
//         setTimeout(() => container.classList.add('show'), 10);
//     } else {
//         container.classList.remove('show');
//         setTimeout(() => container.style.display = 'none', 300);
//     }
// }



//Function to handle start of the function 

$(document).ready(function() {
    $('.sharescreenBtn').on('click', function() {
        console.log('hello');

         // Get text from active voice button
    let activeVoiceText = $('.vrx-btn-custom-voice.active').text().toUpperCase();
    
    // Get text from active custom button
    let activeinput = $('.vrx-btn-custom-output.active').text().toUpperCase();
    console.log(activeinput,activeVoiceText)


        customConfig= {
            setup: {
                generation_config: { 
                    response_modalities: [activeinput],
                    temperature: 0.7
                },
                speech_config: {
                    voice_config: {
                        prebuilt_voice_config: {
                            voice_name: activeVoiceText
                        }
                    }
                }
            }
        };

console.log(customConfig);
selectedMode="screenshare"
startProcess()
    });
});




$(document).ready(function() {
    $('.webcamBtn').on('click', function() {
        console.log('webCamBtn');

         // Get text from active voice button
    let activeVoiceText = $('.vrx-btn-custom-voice.active').text().toUpperCase();
    
    // Get text from active custom button
    let activeinput = $('.vrx-btn-custom-output.active').text().toUpperCase();
    console.log(activeinput,activeVoiceText)


        customConfig= {
            setup: {
                generation_config: { 
                    response_modalities: [activeinput],
                    temperature: 0.7
                },
                speech_config: {
                    voice_config: {
                        prebuilt_voice_config: {
                            voice_name: activeVoiceText
                        }
                    }
                }
            }
        };

console.log(customConfig);
selectedMode = "webcam"
startProcess()
    });
});




//function for selecting output format


$(document).ready(function() {
    $('.vrx-btn-custom-output').on('click', function() {
        // Remove active class from all buttons
        $('.vrx-btn-custom-output').removeClass('active');
        
        // Add active class to clicked button
        $(this).addClass('active');
    });
});


//function for selecting voice 
$(document).ready(function() {
    $('.vrx-btn-custom-voice').on('click', function() {
        // Remove active class from all voice buttons
        $('.vrx-btn-custom-voice').removeClass('active');
        
        // Add active class to clicked button
        $(this).addClass('active');
    });
});


//function for copying Text : 
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
        // Check if clicked element is a copy icon
        if (e.target.matches('img[src="images/icon-copy.svg"]')) {
            // Find the parent div with class brd-top
            const parentDiv = e.target.closest('.brd-top');
            
            if (parentDiv) {
                // Get the text content from p tag and timestamp from span
                const pContent = parentDiv.querySelector('.vrx-primary-light').textContent;
                const timestamp = parentDiv.querySelector('span').textContent;
                
                // Combine the text
                const textToCopy = `${pContent}\n${timestamp}`;
                
                // Copy to clipboard
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        console.log('Text copied successfully');
                    })
                    .catch(err => {
                        console.error('Failed to copy text:', err);
                    });
            }
        }
    });
});

//function to stop listening 
$(document).ready(function() {
    $('.stop-button').click(function(e) {
        e.preventDefault();
        console.log('stopping');
        stopAudioInput();

    });
});
