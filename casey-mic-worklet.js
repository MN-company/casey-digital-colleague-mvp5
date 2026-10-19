/* Capture runs on the audio rendering thread; 20 ms packets at the device sample rate. */
class CaseyMicrophone extends AudioWorkletProcessor {
  constructor(){super();this.size=Math.round(sampleRate*0.02);this.packet=new Float32Array(this.size);this.used=0;}
  process(inputs){const samples=inputs[0]?.[0];if(!samples)return true;
    for(let i=0;i<samples.length;i++){this.packet[this.used++]=samples[i];if(this.used===this.size){this.port.postMessage(this.packet,[this.packet.buffer]);this.packet=new Float32Array(this.size);this.used=0;}}
    return true;
  }
}
registerProcessor('casey-microphone',CaseyMicrophone);
